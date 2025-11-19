async function donateCommand(sock, chatId, message) {
    try {
        const donateInfo = `
╭━━━〔 🐞 𝐃𝐎𝐍𝐀𝐓𝐄 〕━━━╮
┃
┃  💝 *Support Ladybug Development*
┃
┃  Your support helps keep
┃  Ladybug running and improving!
┃
┃  ━━━━━━━━━━━━━━━━━━
┃
┃  💳 *Payment Methods:*
┃
┃  🟢 Ecocash
┃  └ 263777124998
┃
┃  🔵 inbucks
┃  └ 263777124998
┃
┃  ⚡ Bitcoin
┃  └ coming soon
┃
┃  💎 Ethereum
┃  └ coming soon 
┃
┃  ━━━━━━━━━━━━━━━━━━
┃
┃  🎁 *Benefits:*
┃  ├ Premium features
┃  ├ Priority support
┃  ├ Early access to updates
┃  └ Custom commands
┃
┃  ━━━━━━━━━━━━━━━━━━
┃
┃  💚 Thank you for your support!
┃  🐞 Every contribution matters
┃
╰━━━━━━━━━━━━━━━━━━━━╯

> _Built with ❤️ by Ntandomods Team_`.trim();

        await sock.sendMessage(chatId, { text: donateInfo }, { quoted: message });

    } catch (error) {
        console.error('Error in donate command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to load donation information.' 
        }, { quoted: message });
    }
}

module.exports = donateCommand;
