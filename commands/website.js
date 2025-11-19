async function websiteCommand(sock, chatId, message) {
    try {
        const websiteInfo = `
╭━━━〔 🐞 𝐖𝐄𝐁𝐒𝐈𝐓𝐄 〕━━━╮
┃
┃  🌐 *Visit Our Official Website*
┃
┃  ━━━━━━━━━━━━━━━━━━
┃
┃  🔗 *Main Site:*
┃  └ https://ntando-store.onrender.com/
┃
┃  📚 *Documentation:*
┃  └ https://ntando-store.onrender.com/
┃
┃  💻 *GitHub:*
┃  └ https://github.com/ntandomods-team
┃
┃  ━━━━━━━━━━━━━━━━━━
┃
┃  📖 *What You'll Find:*
┃  ├ 📝 Full documentation
┃  ├ 🎓 Tutorials & guides
┃  ├ 💡 Feature showcase
┃  ├ 🔧 Setup instructions
┃  ├ 📰 Latest updates
┃  └ 👥 Community forum
┃
┃  ━━━━━━━━━━━━━━━━━━
┃
┃  🎯 *Quick Links:*
┃  ├ Installation guide
┃  ├ Command list
┃  ├ FAQ section
┃  └ Contact support
┃
╰━━━━━━━━━━━━━━━━━━━━╯

> _🐞 Ladybug - Your Smart WhatsApp Bot_`.trim();

        await sock.sendMessage(chatId, { text: websiteInfo }, { quoted: message });

    } catch (error) {
        console.error('Error in website command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Failed to load website information.' 
        }, { quoted: message });
    }
}

module.exports = websiteCommand;
