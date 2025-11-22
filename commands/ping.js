const os = require('os');
const settings = require('../settings.js');

function formatTime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    seconds = seconds % (24 * 60 * 60);
    const hours = Math.floor(seconds / (60 * 60));
    seconds = seconds % (60 * 60);
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);

    let time = '';
    if (days > 0) time += `${days}d `;
    if (hours > 0) time += `${hours}h `;
    if (minutes > 0) time += `${minutes}m `;
    if (seconds > 0 || time === '') time += `${seconds}s`;

    return time.trim();
}

async function pingCommand(sock, chatId, message) {
    try {
        const start = Date.now();
        await sock.sendMessage(chatId, { text: '🐞 Checking...' }, { quoted: message });
        const end = Date.now();
        const ping = Math.round((end - start) / 2);

        const uptimeInSeconds = process.uptime();
        const uptimeFormatted = formatTime(uptimeInSeconds);

        // Get system info
        const totalMem = (os.totalmem() / (1024 ** 3)).toFixed(2);
        const freeMem = (os.freemem() / (1024 ** 3)).toFixed(2);
        const usedMem = (totalMem - freeMem).toFixed(2);

        const botInfo = `
╭━━━〔 🐞 𝐋𝐀𝐃𝐘𝐁𝐔𝐆 𝐗𝟐 〕━━━╮
┃
┃  ⚡ *Speed*      : ${ping} ms
┃  ⏰ *Runtime*    : ${uptimeFormatted}
┃  📌 *Version*    : v${settings.version}
┃  💾 *Memory*     : $${usedMem}/$$ {totalMem} GB
┃  🖥️ *Platform*   : ${os.platform()}
┃  🔧 *Node*       : ${process.version}
┃
╰━━━━━━━━━━━━━━━━━━━━╯

🐞 *Ladybug X2* - Fast & Reliable!`.trim();

        // Reply to the original message with the bot info
        await sock.sendMessage(chatId, { text: botInfo }, { quoted: message });

    } catch (error) {
        console.error('Error in ping command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to get bot status.' });
    }
}

module.exports = pingCommand;
