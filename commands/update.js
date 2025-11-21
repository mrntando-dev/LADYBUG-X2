const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const settings = require('../settings');
const isOwnerOrSudo = require('../lib/isOwner');
const chalk = require('chalk');

// Track last update check time
let lastUpdateCheck = 0;
const UPDATE_CHECK_INTERVAL = 3600000; // Check every 1 hour (adjust as needed)

function run(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, { windowsHide: true }, (err, stdout, stderr) => {
            if (err) return reject(new Error((stderr || stdout || err.message || '').toString()));
            resolve((stdout || '').toString());
        });
    });
}

async function hasGitRepo() {
    const gitDir = path.join(process.cwd(), '.git');
    if (!fs.existsSync(gitDir)) return false;
    try {
        await run('git --version');
        return true;
    } catch {
        return false;
    }
}

async function updateViaGit() {
    const oldRev = (await run('git rev-parse HEAD').catch(() => 'unknown')).trim();
    await run('git fetch --all --prune');
    const newRev = (await run('git rev-parse origin/main')).trim();
    const alreadyUpToDate = oldRev === newRev;
    const commits = alreadyUpToDate ? '' : await run(`git log --pretty=format:"%h %s (%an)" $${oldRev}..$$ {newRev}`).catch(() => '');
    const files = alreadyUpToDate ? '' : await run(`git diff --name-status $${oldRev}$$ {newRev}`).catch(() => '');
    
    // Only update if there are changes
    if (!alreadyUpToDate) {
        await run(`git reset --hard ${newRev}`);
        await run('git clean -fd');
    }
    
    return { oldRev, newRev, alreadyUpToDate, commits, files };
}

function downloadFile(url, dest, visited = new Set()) {
    return new Promise((resolve, reject) => {
        try {
            // Avoid infinite redirect loops
            if (visited.has(url) || visited.size > 5) {
                return reject(new Error('Too many redirects'));
            }
            visited.add(url);

            const useHttps = url.startsWith('https://');
            const client = useHttps ? require('https') : require('http');
            const req = client.get(url, {
                headers: {
                    'User-Agent': 'Ladybug-Updater/1.0',
                    'Accept': '*/*'
                }
            }, res => {
                // Handle redirects
                if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
                    const location = res.headers.location;
                    if (!location) return reject(new Error(`HTTP ${res.statusCode} without Location`));
                    const nextUrl = new URL(location, url).toString();
                    res.resume();
                    return downloadFile(nextUrl, dest, visited).then(resolve).catch(reject);
                }

                if (res.statusCode !== 200) {
                    return reject(new Error(`HTTP ${res.statusCode}`));
                }

                const file = fs.createWriteStream(dest);
                res.pipe(file);
                file.on('finish', () => file.close(resolve));
                file.on('error', err => {
                    try { file.close(() => {}); } catch {}
                    fs.unlink(dest, () => reject(err));
                });
            });
            req.on('error', err => {
                fs.unlink(dest, () => reject(err));
            });
        } catch (e) {
            reject(e);
        }
    });
}

async function extractZip(zipPath, outDir) {
    // Try to use platform tools; no extra npm modules required
    if (process.platform === 'win32') {
        const cmd = `powershell -NoProfile -Command "Expand-Archive -Path '$${zipPath}' -DestinationPath '$$ {outDir.replace(/\\/g, '/')}' -Force"`;
        await run(cmd);
        return;
    }
    // Linux/mac: try unzip, else 7z, else busybox unzip
    try {
        await run('command -v unzip');
        await run(`unzip -o '$${zipPath}' -d '$$ {outDir}'`);
        return;
    } catch {}
    try {
        await run('command -v 7z');
        await run(`7z x -y '$${zipPath}' -o'$$ {outDir}'`);
        return;
    } catch {}
    try {
        await run('busybox unzip -h');
        await run(`busybox unzip -o '$${zipPath}' -d '$$ {outDir}'`);
        return;
    } catch {}
    throw new Error("No system unzip tool found (unzip/7z/busybox). Git mode is recommended on this panel.");
}

function copyRecursive(src, dest, ignore = [], relative = '', outList = []) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
        if (ignore.includes(entry)) continue;
        const s = path.join(src, entry);
        const d = path.join(dest, entry);
        const stat = fs.lstatSync(s);
        if (stat.isDirectory()) {
            copyRecursive(s, d, ignore, path.join(relative, entry), outList);
        } else {
            fs.copyFileSync(s, d);
            if (outList) outList.push(path.join(relative, entry).replace(/\\/g, '/'));
        }
    }
}

async function updateViaZip(sock, chatId, message, zipOverride) {
    const zipUrl = (zipOverride || settings.updateZipUrl || process.env.UPDATE_ZIP_URL || '').trim();
    if (!zipUrl) {
        throw new Error('No ZIP URL configured. Set settings.updateZipUrl or UPDATE_ZIP_URL env.');
    }
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const zipPath = path.join(tmpDir, 'update.zip');
    await downloadFile(zipUrl, zipPath);
    const extractTo = path.join(tmpDir, 'update_extract');
    if (fs.existsSync(extractTo)) fs.rmSync(extractTo, { recursive: true, force: true });
    await extractZip(zipPath, extractTo);

    // Find the top-level extracted folder (GitHub zips create REPO-branch folder)
    const [root] = fs.readdirSync(extractTo).map(n => path.join(extractTo, n));
    const srcRoot = fs.existsSync(root) && fs.lstatSync(root).isDirectory() ? root : extractTo;

    // Copy over while preserving runtime dirs/files
    const ignore = ['node_modules', '.git', 'session', 'tmp', 'tmp/', 'temp', 'data', 'baileys_store.json'];
    const copied = [];
    // Preserve ownerNumber from existing settings.js if present
    let preservedOwner = null;
    let preservedBotOwner = null;
    try {
        const currentSettings = require('../settings');
        preservedOwner = currentSettings && currentSettings.ownerNumber ? String(currentSettings.ownerNumber) : null;
        preservedBotOwner = currentSettings && currentSettings.botOwner ? String(currentSettings.botOwner) : null;
    } catch {}
    copyRecursive(srcRoot, process.cwd(), ignore, '', copied);
    if (preservedOwner) {
        try {
            const settingsPath = path.join(process.cwd(), 'settings.js');
            if (fs.existsSync(settingsPath)) {
                let text = fs.readFileSync(settingsPath, 'utf8');
                text = text.replace(/ownerNumber:\s*'[^']*'/, `ownerNumber: '${preservedOwner}'`);
                if (preservedBotOwner) {
                    text = text.replace(/botOwner:\s*'[^']*'/, `botOwner: '${preservedBotOwner}'`);
                }
                fs.writeFileSync(settingsPath, text);
            }
        } catch {}
    }
    // Cleanup extracted directory
    try { fs.rmSync(extractTo, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(zipPath, { force: true }); } catch {}
    return { copiedFiles: copied, hasUpdate: copied.length > 0 };
}

async function restartProcess(sock, chatId, message) {
    try {
        if (sock && chatId) {
            await sock.sendMessage(chatId, { text: '✅ Update complete! Restarting…' }, { quoted: message });
        }
    } catch {}
    try {
        // Preferred: PM2
        await run('pm2 restart all');
        return;
    } catch {}
    // Panels usually auto-restart when the process exits.
    // Exit after a short delay to allow the above message to flush.
    setTimeout(() => {
        process.exit(0);
    }, 500);
}

// ═══════════════════════════════════════════════════════════
// 🔄 AUTO-UPDATE CHECKER (NEW FUNCTION)
// ═══════════════════════════════════════════════════════════

async function checkForUpdates(sock, silent = true) {
    try {
        const now = Date.now();
        
        // Don't check too frequently
        if (now - lastUpdateCheck < UPDATE_CHECK_INTERVAL) {
            return { hasUpdate: false, reason: 'too_soon' };
        }
        
        lastUpdateCheck = now;
        
        console.log(chalk.cyan('🔍 Checking for updates...'));
        
        if (await hasGitRepo()) {
            const oldRev = (await run('git rev-parse HEAD').catch(() => 'unknown')).trim();
            await run('git fetch --all --prune');
            const newRev = (await run('git rev-parse origin/main')).trim();
            
            if (oldRev !== newRev) {
                console.log(chalk.yellow(`📦 New update available: ${oldRev.substring(0, 7)} → ${newRev.substring(0, 7)}`));
                return { hasUpdate: true, oldRev, newRev, method: 'git' };
            } else {
                if (!silent) {
                    console.log(chalk.green('✅ Bot is up to date!'));
                }
                return { hasUpdate: false, reason: 'up_to_date' };
            }
        } else {
            // For ZIP mode, we'd need to compare version numbers or checksums
            // For simplicity, we'll skip auto-update in ZIP mode without manual trigger
            console.log(chalk.gray('ℹ️ Auto-update only works with Git repos. Use .update command for ZIP mode.'));
            return { hasUpdate: false, reason: 'zip_mode' };
        }
    } catch (error) {
        console.error(chalk.red('❌ Update check failed:'), error.message);
        return { hasUpdate: false, reason: 'error', error };
    }
}

// ═══════════════════════════════════════════════════════════
// 🚀 AUTO-UPDATE FUNCTION (NEW)
// ═══════════════════════════════════════════════════════════

async function performAutoUpdate(sock, updateInfo) {
    try {
        console.log(chalk.cyan('🔄 Starting automatic update...'));
        
        // Get owner number to notify
        let ownerJid = null;
        try {
            const currentSettings = require('../settings');
            const ownerNumber = currentSettings.ownerNumber || currentSettings.botOwner;
            if (ownerNumber) {
                ownerJid = ownerNumber.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            }
        } catch {}
        
        // Notify owner about update
        if (sock && ownerJid) {
            try {
                await sock.sendMessage(ownerJid, {
                    text: `🔄 *AUTO-UPDATE STARTED*\n\n` +
                          `📦 New version detected!\n` +
                          `Old: ${updateInfo.oldRev.substring(0, 7)}\n` +
                          `New: ${updateInfo.newRev.substring(0, 7)}\n\n` +
                          `⏳ Updating and restarting...`
                });
            } catch (e) {
                console.log(chalk.yellow('⚠️ Could not notify owner:', e.message));
            }
        }
        
        if (updateInfo.method === 'git') {
            // Perform git update
            await run(`git reset --hard ${updateInfo.newRev}`);
            await run('git clean -fd');
            
            console.log(chalk.green('✅ Git update successful!'));
            
            // Install dependencies
            console.log(chalk.cyan('📦 Installing dependencies...'));
            await run('npm install --no-audit --no-fund');
            
            console.log(chalk.green('✅ Dependencies installed!'));
            
            // Notify owner about successful update
            if (sock && ownerJid) {
                try {
                    await sock.sendMessage(ownerJid, {
                        text: `✅ *UPDATE COMPLETED*\n\n` +
                              `Version: ${updateInfo.newRev.substring(0, 7)}\n` +
                              `Status: Successfully updated\n\n` +
                              `🔄 Restarting bot now...`
                    });
                } catch {}
            }
            
            // Restart the bot
            setTimeout(() => {
                console.log(chalk.magenta('🔄 Restarting bot...'));
                restartProcess(sock, ownerJid, null);
            }, 2000);
            
            return { success: true };
        }
        
        return { success: false, reason: 'unsupported_method' };
        
    } catch (error) {
        console.error(chalk.red('❌ Auto-update failed:'), error.message);
        
        // Notify owner about failed update
        if (sock && ownerJid) {
            try {
                await sock.sendMessage(ownerJid, {
                    text: `❌ *AUTO-UPDATE FAILED*\n\n` +
                          `Error: ${error.message}\n\n` +
                          `Please update manually using .update command`
                });
            } catch {}
        }
        
        return { success: false, error };
    }
}

// ═══════════════════════════════════════════════════════════
// 📝 MANUAL UPDATE COMMAND (ORIGINAL WITH MODIFICATIONS)
// ═══════════════════════════════════════════════════════════

async function updateCommand(sock, chatId, message, zipOverride) {
    const senderId = message.key.participant || message.key.remoteJid;
    const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
    
    if (!message.key.fromMe && !isOwner) {
        await sock.sendMessage(chatId, { text: '❌ Only bot owner or sudo can use .update' }, { quoted: message });
        return;
    }
    try {
        // Minimal UX
        await sock.sendMessage(chatId, { text: '🔄 Checking for updates…' }, { quoted: message });
        
        let shouldRestart = false;
        
        if (await hasGitRepo()) {
            const { oldRev, newRev, alreadyUpToDate, commits, files } = await updateViaGit();
            
            if (alreadyUpToDate) {
                await sock.sendMessage(chatId, { 
                    text: `✅ Already up to date!\n\n📌 Current version: ${newRev.substring(0, 7)}` 
                }, { quoted: message });
                return; // Don't restart if already updated
            } else {
                shouldRestart = true;
                
                // Show update details
                let updateMsg = `✅ *UPDATE AVAILABLE*\n\n`;
                updateMsg += `📦 Version: ${oldRev.substring(0, 7)} → ${newRev.substring(0, 7)}\n\n`;
                
                if (commits) {
                    updateMsg += `📝 *Recent Changes:*\n${commits.split('\n').slice(0, 5).join('\n')}\n\n`;
                }
                
                updateMsg += `⏳ Installing update...`;
                
                await sock.sendMessage(chatId, { text: updateMsg }, { quoted: message });
                
                // Install dependencies if updated
                await sock.sendMessage(chatId, { text: '📦 Installing dependencies...' }, { quoted: message });
                await run('npm install --no-audit --no-fund');
            }
        } else {
            const { copiedFiles, hasUpdate } = await updateViaZip(sock, chatId, message, zipOverride);
            
            if (!hasUpdate || copiedFiles.length === 0) {
                await sock.sendMessage(chatId, { 
                    text: '✅ Already up to date!' 
                }, { quoted: message });
                return; // Don't restart if no files were copied
            } else {
                shouldRestart = true;
                await sock.sendMessage(chatId, { 
                    text: `✅ Updated ${copiedFiles.length} files` 
                }, { quoted: message });
            }
        }
        
        // Only restart if there was an actual update
        if (shouldRestart) {
            try {
                const v = require('../settings').version || 'Unknown';
                await sock.sendMessage(chatId, { 
                    text: `✅ Update completed successfully!\n\n` +
                          `📌 Version: ${v}\n` +
                          `🔄 Restarting bot in 3 seconds...` 
                }, { quoted: message });
            } catch {
                await sock.sendMessage(chatId, { 
                    text: '✅ Update completed successfully!\n\n🔄 Restarting bot...\n\n💡 Type .ping to check the latest version.' 
                }, { quoted: message });
            }
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            await restartProcess(sock, chatId, message);
        }
        
    } catch (err) {
        console.error('Update failed:', err);
        await sock.sendMessage(chatId, { 
            text: `❌ *UPDATE FAILED*\n\n${String(err.message || err)}\n\n💡 Please check logs for details.` 
        }, { quoted: message });
    }
}

// ═══════════════════════════════════════════════════════════
// 🔄 START AUTO-UPDATE SCHEDULER (NEW)
// ═══════════════════════════════════════════════════════════

function startAutoUpdateChecker(sock) {
    console.log(chalk.cyan('🔄 Auto-update checker started'));
    console.log(chalk.gray(`   Checking every ${UPDATE_CHECK_INTERVAL / 60000} minutes`));
    
    // Initial check after 5 minutes of uptime
    setTimeout(async () => {
        const updateInfo = await checkForUpdates(sock, false);
        
        if (updateInfo.hasUpdate) {
            console.log(chalk.yellow('📦 Update found! Starting auto-update...'));
            await performAutoUpdate(sock, updateInfo);
        }
    }, 300000); // 5 minutes
    
    // Periodic checks
    setInterval(async () => {
        const updateInfo = await checkForUpdates(sock, true);
        
        if (updateInfo.hasUpdate) {
            console.log(chalk.yellow('📦 Update found! Starting auto-update...'));
            await performAutoUpdate(sock, updateInfo);
        }
    }, UPDATE_CHECK_INTERVAL);
}

// ═══════════════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = updateCommand;
module.exports.checkForUpdates = checkForUpdates;
module.exports.performAutoUpdate = performAutoUpdate;
module.exports.startAutoUpdateChecker = startAutoUpdateChecker;
module.exports.UPDATE_CHECK_INTERVAL = UPDATE_CHECK_INTERVAL;
