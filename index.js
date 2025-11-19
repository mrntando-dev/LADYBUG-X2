/**
 * Knight Bot - A WhatsApp Bot
 * Copyright (c) 2024 Professor
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License.
 * 
 * Credits:
 * - Baileys Library by @adiwajshing
 * - Pair Code implementation inspired by TechGod143 & DGXEON
 */
require('./settings')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const FileType = require('file-type')
const path = require('path')
const axios = require('axios')
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
const PhoneNumber = require('awesome-phonenumber')
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif')
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetch, await, sleep, reSize } = require('./lib/myfunc')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateMessageID,
    downloadContentFromMessage,
    jidDecode,
    proto,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys")
const NodeCache = require("node-cache")
const pino = require("pino")
const readline = require("readline")
const { parsePhoneNumber } = require("libphonenumber-js")
const { PHONENUMBER_MCC } = require('@whiskeysockets/baileys/lib/Utils/generics')
const { rmSync, existsSync } = require('fs')
const { join } = require('path')

// Import lightweight store
const store = require('./lib/lightweight_store')

// Initialize store
store.readFromFile()
const settings = require('./settings')
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000)

// ═══════════════════════════════════════════════════════════
// 🛡️ ANTI-BAN & PROTECTION SYSTEM
// ═══════════════════════════════════════════════════════════

// Message rate limiter to prevent spam detection
const messageRateLimiter = new Map()
const MESSAGE_LIMIT = 20 // Max messages per minute
const RATE_LIMIT_WINDOW = 60000 // 1 minute

function canSendMessage(jid) {
    const now = Date.now()
    const userLimits = messageRateLimiter.get(jid) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW }
    
    if (now > userLimits.resetTime) {
        messageRateLimiter.set(jid, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
        return true
    }
    
    if (userLimits.count >= MESSAGE_LIMIT) {
        return false
    }
    
    userLimits.count++
    messageRateLimiter.set(jid, userLimits)
    return true
}

// Anti-ban delays between messages
const SAFE_DELAYS = {
    individual: [1000, 2000], // 1-2 seconds
    group: [2000, 4000],      // 2-4 seconds
    broadcast: [3000, 5000]   // 3-5 seconds
}

function getRandomDelay(type = 'individual') {
    const [min, max] = SAFE_DELAYS[type] || SAFE_DELAYS.individual
    return Math.floor(Math.random() * (max - min + 1)) + min
}

// Activity tracker to appear more human-like
let lastActivityTime = Date.now()
let messageCount = 0
const MAX_MESSAGES_PER_HOUR = 100

function updateActivity() {
    const now = Date.now()
    const hourAgo = now - 3600000
    
    if (lastActivityTime < hourAgo) {
        messageCount = 0
    }
    
    messageCount++
    lastActivityTime = now
    
    if (messageCount > MAX_MESSAGES_PER_HOUR) {
        console.log(chalk.yellow('⚠️ Approaching message limit, implementing cooldown...'))
        return false
    }
    
    return true
}

// Behavior monitoring - detect suspicious patterns
const behaviorMonitor = {
    lastMessageTime: Date.now(),
    messagePattern: [],
    
    recordMessage() {
        const now = Date.now()
        this.messagePattern.push(now)
        
        // Keep only last 50 messages
        if (this.messagePattern.length > 50) {
            this.messagePattern.shift()
        }
        
        this.lastMessageTime = now
    },
    
    isSuspiciousBehavior() {
        if (this.messagePattern.length < 10) return false
        
        const intervals = []
        for (let i = 1; i < this.messagePattern.length; i++) {
            intervals.push(this.messagePattern[i] - this.messagePattern[i - 1])
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
        
        // If messages are too uniform (bot-like), return true
        if (avgInterval < 500) {
            console.log(chalk.red('⚠️ Suspicious behavior detected: Too fast messaging'))
            return true
        }
        
        return false
    }
}

// Auto-restart on connection issues
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5

// ═══════════════════════════════════════════════════════════
// 💾 MEMORY OPTIMIZATION
// ═══════════════════════════════════════════════════════════

// Enhanced garbage collection
setInterval(() => {
    if (global.gc) {
        global.gc()
        const used = Math.round(process.memoryUsage().rss / 1024 / 1024)
        console.log(`🧹 Garbage collection: ${used}MB RAM used`)
    }
}, 60_000) // every 1 minute

// Memory monitoring with dynamic threshold
setInterval(() => {
    const memUsage = process.memoryUsage()
    const usedMB = Math.round(memUsage.rss / 1024 / 1024)
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
    
    console.log(chalk.cyan(`📊 Memory: $${usedMB}MB RSS,$$ {heapUsedMB}MB Heap`))
    
    if (usedMB > 450) {
        console.log(chalk.red('⚠️ RAM critical (>450MB), forcing cleanup...'))
        
        // Clear caches
        if (messageRateLimiter.size > 100) {
            messageRateLimiter.clear()
        }
        
        // Force GC
        if (global.gc) global.gc()
        
        setTimeout(() => {
            const newUsed = Math.round(process.memoryUsage().rss / 1024 / 1024)
            if (newUsed > 480) {
                console.log(chalk.red('💥 RAM still too high, restarting...'))
                process.exit(1)
            }
        }, 5000)
    }
}, 30_000) // check every 30 seconds

// ═══════════════════════════════════════════════════════════
// ⚙️ CONFIGURATION
// ═══════════════════════════════════════════════════════════

let phoneNumber = "911234567890"
let owner = JSON.parse(fs.readFileSync('./data/owner.json'))

global.botname = "LADYBUG X BOT"
global.themeemoji = "🐞"
global.sessionName = "ladybug-session"

const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code")
const useMobile = process.argv.includes("--mobile")

const rl = process.stdin.isTTY ? readline.createInterface({ 
    input: process.stdin, 
    output: process.stdout 
}) : null

const question = (text) => {
    if (rl) {
        return new Promise((resolve) => rl.question(text, resolve))
    } else {
        return Promise.resolve(settings.ownerNumber || phoneNumber)
    }
}

// ═══════════════════════════════════════════════════════════
// 🚀 BOT INITIALIZATION
// ═══════════════════════════════════════════════════════════

async function startXeonBotInc() {
    try {
        let { version, isLatest } = await fetchLatestBaileysVersion()
        console.log(chalk.blue(`📱 Using WA version ${version}`))
        
        const { state, saveCreds } = await useMultiFileAuthState(`./session`)
        const msgRetryCounterCache = new NodeCache()

        const XeonBotInc = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: !pairingCode,
            browser: ["Ladybug X Bot", "Safari", "3.0"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
            },
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            retryRequestDelayMs: 10000,
            transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 3000 },
            maxMsgRetryCount: 5,
            appStateMacVerification: {
                patch: true,
                snapshot: true,
            },
            getMessage: async (key) => {
                let jid = jidNormalizedUser(key.remoteJid)
                let msg = await store.loadMessage(jid, key.id)
                return msg?.message || ""
            },
            msgRetryCounterCache,
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
            // Anti-ban: Don't send too many presence updates
            emitOwnEvents: false,
            fireInitQueries: true,
            shouldSyncHistoryMessage: () => false,
        })

        // Save credentials when they update
        XeonBotInc.ev.on('creds.update', saveCreds)

        store.bind(XeonBotInc.ev)

        // ═══════════════════════════════════════════════════════════
        // 📨 MESSAGE HANDLING WITH ANTI-BAN
        // ═══════════════════════════════════════════════════════════

        XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
            try {
                const mek = chatUpdate.messages[0]
                if (!mek.message) return
                
                mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') 
                    ? mek.message.ephemeralMessage.message 
                    : mek.message
                
                // Handle status updates
                if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                    await handleStatus(XeonBotInc, chatUpdate);
                    return;
                }
                
                // Private mode check
                if (!XeonBotInc.public && !mek.key.fromMe && chatUpdate.type === 'notify') {
                    const isGroup = mek.key?.remoteJid?.endsWith('@g.us')
                    if (!isGroup) return
                }
                
                // Skip BAE5 messages
                if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return

                // Anti-ban: Rate limiting
                const chatId = mek.key.remoteJid
                if (!canSendMessage(chatId)) {
                    console.log(chalk.yellow(`⏳ Rate limit reached for ${chatId}`))
                    return
                }

                // Anti-ban: Activity monitoring
                if (!updateActivity()) {
                    console.log(chalk.yellow('⏳ Taking a break to avoid detection...'))
                    await delay(30000) // 30 second cooldown
                }

                // Record behavior
                behaviorMonitor.recordMessage()
                
                // Check for suspicious patterns
                if (behaviorMonitor.isSuspiciousBehavior()) {
                    console.log(chalk.yellow('⏸️ Suspicious pattern detected, adding delay...'))
                    await delay(getRandomDelay('broadcast'))
                }

                // Clear message retry cache to prevent memory bloat
                if (XeonBotInc?.msgRetryCounterCache) {
                    XeonBotInc.msgRetryCounterCache.clear()
                }

                try {
                    // Add natural delay before processing
                    const isGroup = chatId?.endsWith('@g.us')
                    const delayType = isGroup ? 'group' : 'individual'
                    await delay(getRandomDelay(delayType))
                    
                    await handleMessages(XeonBotInc, chatUpdate, true)
                } catch (err) {
                    console.error("Error in handleMessages:", err)
                    
                    if (mek.key && mek.key.remoteJid) {
                        try {
                            await delay(getRandomDelay('individual'))
                            await XeonBotInc.sendMessage(mek.key.remoteJid, {
                                text: '❌ An error occurred. Please try again later.',
                                contextInfo: {
                                    forwardingScore: 1,
                                    isForwarded: true,
                                    forwardedNewsletterMessageInfo: {
                                        newsletterJid: '120363161513685998@newsletter',
                                        newsletterName: 'Ladybug X Bot',
                                        serverMessageId: -1
                                    }
                                }
                            })
                        } catch (sendErr) {
                            console.error('Failed to send error message:', sendErr)
                        }
                    }
                }
            } catch (err) {
                console.error("Error in messages.upsert:", err)
            }
        })

        // ═══════════════════════════════════════════════════════════
        // 👤 CONTACT & NAME HANDLING
        // ═══════════════════════════════════════════════════════════

        XeonBotInc.decodeJid = (jid) => {
            if (!jid) return jid
            if (/:\d+@/gi.test(jid)) {
                let decode = jidDecode(jid) || {}
                return decode.user && decode.server && decode.user + '@' + decode.server || jid
            } else return jid
        }

        XeonBotInc.ev.on('contacts.update', update => {
            for (let contact of update) {
                let id = XeonBotInc.decodeJid(contact.id)
                if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
            }
        })

        XeonBotInc.getName = (jid, withoutContact = false) => {
            id = XeonBotInc.decodeJid(jid)
            withoutContact = XeonBotInc.withoutContact || withoutContact
            let v
            if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
                v = store.contacts[id] || {}
                if (!(v.name || v.subject)) v = XeonBotInc.groupMetadata(id) || {}
                resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
            })
            else v = id === '0@s.whatsapp.net' ? {
                id,
                name: 'WhatsApp'
            } : id === XeonBotInc.decodeJid(XeonBotInc.user.id) ?
                XeonBotInc.user :
                (store.contacts[id] || {})
            return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
        }

        XeonBotInc.public = true
        XeonBotInc.serializeM = (m) => smsg(XeonBotInc, m, store)

        // ═══════════════════════════════════════════════════════════
        // 🔐 ENHANCED SEND MESSAGE WITH ANTI-BAN
        // ═══════════════════════════════════════════════════════════

        const originalSendMessage = XeonBotInc.sendMessage.bind(XeonBotInc)
        XeonBotInc.sendMessage = async (jid, content, options = {}) => {
            try {
                // Rate limiting check
                if (!canSendMessage(jid)) {
                    console.log(chalk.yellow(`⏳ Delaying message to ${jid} due to rate limit`))
                    await delay(5000)
                }

                // Add natural delay
                const isGroup = jid?.endsWith('@g.us')
                await delay(getRandomDelay(isGroup ? 'group' : 'individual'))

                // Record activity
                behaviorMonitor.recordMessage()

                return await originalSendMessage(jid, content, options)
            } catch (error) {
                console.error('Send message error:', error)
                throw error
            }
        }

        // ═══════════════════════════════════════════════════════════
        // 📞 PAIRING CODE HANDLER
        // ═══════════════════════════════════════════════════════════

        if (pairingCode && !XeonBotInc.authState.creds.registered) {
            if (useMobile) throw new Error('Cannot use pairing code with mobile api')

            let phoneNumber
            if (!!global.phoneNumber) {
                phoneNumber = global.phoneNumber
            } else {
                phoneNumber = await question(chalk.bgBlack(chalk.greenBright(`🐞 Please type your WhatsApp number\nFormat: 6281376552730 (without + or spaces): `)))
            }

            phoneNumber = phoneNumber.replace(/[^0-9]/g, '')

            const pn = require('awesome-phonenumber');
            if (!pn('+' + phoneNumber).isValid()) {
                console.log(chalk.red('❌ Invalid phone number. Please try again.'));
                process.exit(1);
            }

            setTimeout(async () => {
                try {
                    let code = await XeonBotInc.requestPairingCode(phoneNumber)
                    code = code?.match(/.{1,4}/g)?.join("-") || code
                    console.log(chalk.black(chalk.bgGreen(`🐞 Your Pairing Code: `)), chalk.black(chalk.white(code)))
                    console.log(chalk.yellow(`\n📱 Enter this code in WhatsApp:\n1. Open WhatsApp\n2. Settings > Linked Devices\n3. Link a Device\n4. Enter code: ${code}`))
                } catch (error) {
                    console.error('❌ Error requesting pairing code:', error)
                }
            }, 3000)
        }

        // ═══════════════════════════════════════════════════════════
        // 🔌 CONNECTION HANDLING WITH AUTO-RECONNECT
        // ═══════════════════════════════════════════════════════════

        XeonBotInc.ev.on('connection.update', async (s) => {
            const { connection, lastDisconnect, qr } = s
            
            if (qr) {
                console.log(chalk.yellow('📱 QR Code generated. Scan with WhatsApp.'))
            }
            
            if (connection === 'connecting') {
                console.log(chalk.yellow('🔄 Connecting to WhatsApp...'))
            }
            
            if (connection == "open") {
                reconnectAttempts = 0
                console.log(chalk.magenta(` `))
                console.log(chalk.green(`🐞 Connected to => ` + JSON.stringify(XeonBotInc.user, null, 2)))

                try {
                    const botNumber = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net';
                    await delay(2000)
                    await XeonBotInc.sendMessage(botNumber, {
                        text: `🐞 *LADYBUG X BOT CONNECTED* 🐞\n\n` +
                              `⏰ Time: ${new Date().toLocaleString()}\n` +
                              `✅ Status: Online & Protected\n` +
                              `🛡️ Anti-Ban: Active\n` +
                              `🔒 Security: Enhanced\n\n` +
                              `🔗 Join our channel for updates!`,
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '120363161513685998@newsletter',
                                newsletterName: 'Ladybug X Bot',
                                serverMessageId: -1
                            }
                        }
                    });
                } catch (error) {
                    console.error('Error sending connection message:', error.message)
                }

                await delay(1999)
                console.log(chalk.yellow(`\n\n                  ${chalk.bold.magenta(`[ ${global.botname || 'LADYBUG X BOT'} ]`)}\n\n`))
                console.log(chalk.cyan(`< ================================================== >`))
                console.log(chalk.magenta(`\n${global.themeemoji} YT CHANNEL: MR UNIQUE HACKER`))
                console.log(chalk.magenta(`${global.themeemoji} GITHUB: mruniquehacker`))
                console.log(chalk.magenta(`${global.themeemoji} WA NUMBER: ${owner}`))
                console.log(chalk.magenta(`${global.themeemoji} CREDIT: MR UNIQUE HACKER`))
                console.log(chalk.green(`${global.themeemoji} 🤖 Bot Status: ONLINE ✅`))
                console.log(chalk.blue(`${global.themeemoji} Version: ${settings.version}`))
                console.log(chalk.yellow(`${global.themeemoji} 🛡️ Anti-Ban Protection: ACTIVE`))
                console.log(chalk.cyan(`< ================================================== >`))
            }
            
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
                const statusCode = lastDisconnect?.error?.output?.statusCode
                const reason = lastDisconnect?.error?.message || 'Unknown'
                
                console.log(chalk.red(`❌ Connection closed: ${reason} (Code: ${statusCode})`))
                
                if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                    try {
                        if (existsSync('./session')) {
                            rmSync('./session', { recursive: true, force: true })
                            console.log(chalk.yellow('🗑️ Session deleted. Please re-authenticate.'))
                        }
                    } catch (error) {
                        console.error('Error deleting session:', error)
                    }
                    console.log(chalk.red('🔒 Session logged out. Restart bot to re-authenticate.'))
                    process.exit(0)
                }
                
                if (shouldReconnect) {
                    reconnectAttempts++
                    
                    if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
                        console.log(chalk.red(`❌ Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Exiting...`))
                        process.exit(1)
                    }
                    
                    const waitTime = Math.min(5000 * reconnectAttempts, 30000)
                    console.log(chalk.yellow(`🔄 Reconnecting in $${waitTime/1000}s... (Attempt$$ {reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`))
                    await delay(waitTime)
                    startXeonBotInc()
                }
            }
        })

        // ═══════════════════════════════════════════════════════════
        // 📞 ANTI-CALL SYSTEM
        // ═══════════════════════════════════════════════════════════

        const antiCallNotified = new Set();
        const callBlockDelay = 1500; // Increased delay for safety

        XeonBotInc.ev.on('call', async (calls) => {
            try {
                const { readState: readAnticallState } = require('./commands/anticall');
                const state = readAnticallState();
                if (!state.enabled) return;

                for (const call of calls) {
                    const callerJid = call.from || call.peerJid || call.chatId;
                    if (!callerJid) continue;

                    try {
                        // Reject call
                        try {
                            if (typeof XeonBotInc.rejectCall === 'function' && call.id) {
                                await XeonBotInc.rejectCall(call.id, callerJid);
                            }
                        } catch {}

                        // Notify caller (once)
                        if (!antiCallNotified.has(callerJid)) {
                            antiCallNotified.add(callerJid);
                            setTimeout(() => antiCallNotified.delete(callerJid), 120000);
                            
                            await delay(1000)
                            await XeonBotInc.sendMessage(callerJid, { 
                                text: '📵 *ANTI-CALL PROTECTION*\n\nCalls are disabled. Your call was rejected and you will be blocked for safety.' 
                            });
                        }
                    } catch {}

                    // Block with safety delay
                    setTimeout(async () => {
                        try { 
                            await XeonBotInc.updateBlockStatus(callerJid, 'block');
                            console.log(chalk.yellow(`🚫 Blocked caller: ${callerJid}`))
                        } catch {}
                    }, callBlockDelay);
                }
            } catch (e) {
                console.error('Anti-call error:', e)
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 👥 GROUP & STATUS EVENT HANDLERS
        // ═══════════════════════════════════════════════════════════

        XeonBotInc.ev.on('group-participants.update', async (update) => {
            try {
                await delay(getRandomDelay('group'))
                await handleGroupParticipantUpdate(XeonBotInc, update);
            } catch (error) {
                console.error('Group participant update error:', error)
            }
        });

        XeonBotInc.ev.on('messages.reaction', async (reaction) => {
            try {
                await handleStatus(XeonBotInc, reaction);
            } catch (error) {
                console.error('Reaction handler error:', error)
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 🛡️ ADDITIONAL SAFETY FEATURES
        // ═══════════════════════════════════════════════════════════

        // Auto-clear old rate limiter entries
        setInterval(() => {
            const now = Date.now()
            for (const [jid, data] of messageRateLimiter.entries()) {
                if (now > data.resetTime + 300000) { // 5 minutes old
                    messageRateLimiter.delete(jid)
                }
            }
        }, 300000) // Every 5 minutes

        // Connection health check
        setInterval(() => {
            if (XeonBotInc.ws.readyState !== XeonBotInc.ws.OPEN) {
                console.log(chalk.yellow('⚠️ WebSocket not open, attempting reconnect...'))
                XeonBotInc.ws.close()
            }
        }, 60000) // Every minute

        return XeonBotInc
    } catch (error) {
        console.error('❌ Error in startXeonBotInc:', error)
        reconnectAttempts++
        
        if (reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
            await delay(5000 * reconnectAttempts)
            return startXeonBotInc()
        } else {
            console.log(chalk.red('❌ Fatal error, could not start bot'))
            process.exit(1)
        }
    }
}

// ═══════════════════════════════════════════════════════════
// 🚀 START BOT WITH ERROR HANDLING
// ═══════════════════════════════════════════════════════════

console.log(chalk.magenta(`
╔═══════════════════════════════════════╗
║                                       ║
║       🐞 LADYBUG X BOT 🐞            ║
║                                       ║
║   Enhanced with Anti-Ban Protection   ║
║                                       ║
╚═══════════════════════════════════════╝
`))

startXeonBotInc().catch(error => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
})

// ═══════════════════════════════════════════════════════════
// 🛡️ PROCESS ERROR HANDLERS
// ═══════════════════════════════════════════════════════════

process.on('uncaughtException', (err) => {
    console.error(chalk.red('💥 Uncaught Exception:'), err)
    // Don't exit on uncaught exception, try to recover
})

process.on('unhandledRejection', (err) => {
    console.error(chalk.red('💥 Unhandled Rejection:'), err)
    // Don't exit on unhandled rejection
})

process.on('SIGINT', () => {
    console.log(chalk.yellow('\n👋 Shutting down gracefully...'))
    store.writeToFile()
    process.exit(0)
})

process.on('SIGTERM', () => {
    console.log(chalk.yellow('\n👋 Received SIGTERM, shutting down...'))
    store.writeToFile()
    process.exit(0)
})

// ═══════════════════════════════════════════════════════════
// 🔄 HOT RELOAD
// ═══════════════════════════════════════════════════════════

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.magenta(`🔄 Update detected: ${__filename}`))
    delete require.cache[file]
    require(file)
})

console.log(chalk.green('✅ Ladybug X Bot initialized successfully!'))
