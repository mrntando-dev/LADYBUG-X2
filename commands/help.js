const settings = require('../settings');
const fs = require('fs');
const path = require('path');

// Dynamic stats calculator
function getStats() {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    return {
        uptime: `$${hours}h$$ {minutes}m ${seconds}s`,
        memory: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
        platform: process.platform,
        nodeVersion: process.version
    };
}

// Category emojis
const categoryIcons = {
    general: '🌟',
    admin: '👑',
    owner: '⚡',
    media: '🎨',
    ai: '🤖',
    fun: '🎮',
    downloader: '📥',
    maker: '✨',
    anime: '🎭',
    github: '💻'
};

async function helpCommand(sock, chatId, message, args) {
    const stats = getStats();
    const prefix = settings.prefix || '.';
    
    // Check if specific category requested
    const category = args[0]?.toLowerCase();
    
    if (category) {
        return sendCategoryMenu(sock, chatId, message, category, prefix, stats);
    }

    // Main menu with all categories
    const mainMenu = `
┏━━━『 *LADYBUG X2* 』━━━┓
┃
┃ ╭─────────────────
┃ │ 🤖 *Bot:* ${settings.botName || 'Ladybug X2'}
┃ │ 👨‍💻 *Owner:* ${settings.botOwner || 'Mr Ntando Ofc'}
┃ │ 📌 *Version:* ${settings.version || '2.0.0'}
┃ │ ⏰ *Uptime:* ${stats.uptime}
┃ │ 💾 *Memory:* ${stats.memory}
┃ │ 🖥️ *Platform:* ${stats.platform}
┃ │ 📍 *Prefix:* ${prefix}
┃ ╰─────────────────
┃
┗━━━━━━━━━━━━━━━━━━━━━

╔═══════════════════════╗
   *📚 COMMAND CATEGORIES*
╚═══════════════════════╝

┏━━━━━━━━━━━━━━━━━━━━━┓
┃ ${categoryIcons.general} *GENERAL COMMANDS*
┃ ➤ ${prefix}menu general
┃ ➤ Total: 20 commands
┃ ➤ Basic bot utilities
┗━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━┓
┃ ${categoryIcons.admin} *ADMIN COMMANDS*
┃ ➤ ${prefix}menu admin
┃ ➤ Total: 25 commands
┃ ➤ Group management tools
┗━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━┓
┃ ${categoryIcons.owner} *OWNER COMMANDS*
┃ ➤ ${prefix}menu owner
┃ ➤ Total: 15 commands
┃ ➤ Bot owner exclusive
┗━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━┓
┃ ${categoryIcons.media} *MEDIA COMMANDS*
┃ ➤ ${prefix}menu media
┃ ➤ Total: 18 commands
┃ ➤ Images, stickers & edits
┗━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━┓
┃ ${categoryIcons.ai} *AI COMMANDS*
┃ ➤ ${prefix}menu ai
┃ ➤ Total: 5 commands
┃ ➤ Artificial Intelligence
┗━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━┓
┃ ${categoryIcons.fun} *FUN & GAMES*
┃ ➤ ${prefix}menu fun
┃ ➤ Total: 15 commands
┃ ➤ Entertainment zone
┗━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━┓
┃ ${categoryIcons.downloader} *DOWNLOADER*
┃ ➤ ${prefix}menu download
┃ ➤ Total: 8 commands
┃ ➤ Media downloads
┗━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━┓
┃ ${categoryIcons.maker} *TEXT MAKER*
┃ ➤ ${prefix}menu maker
┃ ➤ Total: 17 commands
┃ ➤ Logo & text effects
┗━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━┓
┃ ${categoryIcons.anime} *ANIME ZONE*
┃ ➤ ${prefix}menu anime
┃ ➤ Total: 12 commands
┃ ➤ Anime & manga content
┗━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━┓
┃ ${categoryIcons.github} *DEVELOPER*
┃ ➤ ${prefix}menu dev
┃ ➤ Total: 5 commands
┃ ➤ GitHub & scripts
┗━━━━━━━━━━━━━━━━━━━━━┛

╔═════════════════════╗
   *🔥 QUICK ACCESS*
╚═════════════════════╝

│ 📊 ${prefix}stats - Bot statistics
│ 🔔 ${prefix}updates - Latest features
│ 💡 ${prefix}help <cmd> - Command info
│ 🌐 ${prefix}ping - Speed test
│ 👥 ${prefix}support - Get help

┏━━━━━━━━━━━━━━━━━━━━━┓
│ 🎯 *TIP:* Use ${prefix}menu <category>
│ to view detailed commands!
│ Example: ${prefix}menu fun
┗━━━━━━━━━━━━━━━━━━━━━┛

╔═════════════════════╗
  *📱 STAY CONNECTED*
╚═════════════════════╝

│ 📺 YouTube: ${global.ytch || 'Not Set'}
│ 💬 WhatsApp: ${settings.ownerNumber || 'Not Set'}
│ ⭐ GitHub: github.com/mruniquehacker
│ 🌐 Website: Coming Soon

┏━━━━━━━━━━━━━━━━━━━━━┓
│  © 2025 Ladybug X2
│  Powered by Mr Unique Hacker
│  All Rights Reserved
┗━━━━━━━━━━━━━━━━━━━━━┛`;

    try {
        const imagePath = path.join(__dirname, '../assets/bot_image.jpg');
        
        const buttons = [
            { buttonId: `${prefix}menu general`, buttonText: { displayText: '🌟 General' }, type: 1 },
            { buttonId: `${prefix}menu fun`, buttonText: { displayText: '🎮 Fun' }, type: 1 },
            { buttonId: `${prefix}stats`, buttonText: { displayText: '📊 Stats' }, type: 1 }
        ];

        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: mainMenu,
                footer: '⚡ Ladybug X2 - The Ultimate WhatsApp Bot',
                buttons: buttons,
                headerType: 4,
                contextInfo: {
                    externalAdReply: {
                        title: '🔥 LADYBUG X2 MENU',
                        body: `Uptime: ${stats.uptime} | Memory: ${stats.memory}`,
                        thumbnailUrl: 'https://i.imgur.com/your-thumbnail.jpg',
                        sourceUrl: global.ytch || 'https://youtube.com',
                        mediaType: 1,
                        renderLargerThumbnail: true
                    },
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363161513685998@newsletter',
                        newsletterName: '⚡ Ladybug X2 Updates',
                        serverMessageId: -1
                    }
                }
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { 
                text: mainMenu,
                footer: '⚡ Ladybug X2 - The Ultimate WhatsApp Bot',
                buttons: buttons,
                headerType: 1,
                contextInfo: {
                    externalAdReply: {
                        title: '🔥 LADYBUG X2 MENU',
                        body: `Uptime: ${stats.uptime} | Memory: ${stats.memory}`,
                        thumbnailUrl: 'https://i.imgur.com/your-thumbnail.jpg',
                        sourceUrl: global.ytch || 'https://youtube.com',
                        mediaType: 1,
                        renderLargerThumbnail: true
                    },
                    forwardingScore: 999,
                    isForwarded: true
                }
            }, { quoted: message });
        }
    } catch (error) {
        console.error('Error in help command:', error);
        await sock.sendMessage(chatId, { text: mainMenu }, { quoted: message });
    }
}

// Category-specific menus
async function sendCategoryMenu(sock, chatId, message, category, prefix, stats) {
    const menus = {
        general: `
┏━━━『 ${categoryIcons.general} *GENERAL* 』━━━┓
┃
┃ ╭─「 *Information* 」
┃ │ ${prefix}help - Show this menu
┃ │ ${prefix}menu - Command categories
┃ │ ${prefix}ping - Check bot speed
┃ │ ${prefix}alive - Bot status
┃ │ ${prefix}owner - Contact owner
┃ │ ${prefix}stats - Bot statistics
┃ │ ${prefix}jid - Get JID info
┃ ╰─────────────────
┃
┃ ╭─「 *Utilities* 」
┃ │ ${prefix}weather <city> - Weather info
┃ │ ${prefix}tts <text> - Text to speech
┃ │ ${prefix}trt <text> <lang> - Translate
┃ │ ${prefix}ss <url> - Screenshot website
┃ │ ${prefix}url - Upload image to URL
┃ │ ${prefix}quote - Random quote
┃ │ ${prefix}fact - Random fact
┃ │ ${prefix}joke - Random joke
┃ │ ${prefix}news - Latest news
┃ ╰─────────────────
┃
┃ ╭─「 *Group Info* 」
┃ │ ${prefix}groupinfo - Group details
┃ │ ${prefix}staff - List admins
┃ │ ${prefix}admins - Tag all admins
┃ │ ${prefix}vv - View once bypass
┃ ╰─────────────────
┃
┗━━━━━━━━━━━━━━━━━━━━━

💡 *Tip:* Use ${prefix}help <command> for detailed info
📊 *Active Users:* Loading...
⏰ *Uptime:* ${stats.uptime}`,

        admin: `
┏━━━『 ${categoryIcons.admin} *ADMIN* 』━━━┓
┃
┃ ╭─「 *Member Management* 」
┃ │ ${prefix}ban @user - Ban member
┃ │ ${prefix}kick @user - Remove member
┃ │ ${prefix}promote @user - Make admin
┃ │ ${prefix}demote @user - Remove admin
┃ │ ${prefix}warn @user - Warn member
┃ │ ${prefix}warnings @user - Check warnings
┃ ╰─────────────────
┃
┃ ╭─「 *Group Control* 」
┃ │ ${prefix}mute <minutes> - Mute group
┃ │ ${prefix}unmute - Unmute group
┃ │ ${prefix}delete - Delete message
┃ │ ${prefix}clear - Clear messages
┃ │ ${prefix}resetlink - Reset invite link
┃ │ ${prefix}setgdesc <text> - Set description
┃ │ ${prefix}setgname <name> - Set group name
┃ │ ${prefix}setgpp - Set group picture
┃ ╰─────────────────
┃
┃ ╭─「 *Broadcast* 」
┃ │ ${prefix}tag <msg> - Tag members
┃ │ ${prefix}tagall - Tag everyone
┃ │ ${prefix}tagnotadmin - Tag non-admins
┃ │ ${prefix}hidetag <msg> - Hidden tag
┃ ╰─────────────────
┃
┃ ╭─「 *Security* 」
┃ │ ${prefix}antilink <on/off> - Anti-link
┃ │ ${prefix}antibadword <on/off> - Bad word filter
┃ │ ${prefix}antitag <on/off> - Anti-tag
┃ │ ${prefix}welcome <on/off> - Welcome message
┃ │ ${prefix}goodbye <on/off> - Goodbye message
┃ │ ${prefix}chatbot <on/off> - AI chatbot
┃ ╰─────────────────
┃
┗━━━━━━━━━━━━━━━━━━━━━

⚠️ *Note:* Admin commands require group admin privileges
🔒 *Security:* All actions are logged`,

        owner: `
┏━━━『 ${categoryIcons.owner} *OWNER* 』━━━┓
┃
┃ ╭─「 *Bot Management* 」
┃ │ ${prefix}mode <public/private> - Bot mode
┃ │ ${prefix}update - Update bot
┃ │ ${prefix}settings - View settings
┃ │ ${prefix}setpp - Set bot profile pic
┃ │ ${prefix}clearsession - Clear session
┃ │ ${prefix}cleartmp - Clear temp files
┃ ╰─────────────────
┃
┃ ╭─「 *Auto Features* 」
┃ │ ${prefix}autoreact <on/off> - Auto react
┃ │ ${prefix}autostatus <on/off> - Auto view status
┃ │ ${prefix}autostatus react <on/off> - React to status
┃ │ ${prefix}autotyping <on/off> - Auto typing
┃ │ ${prefix}autoread <on/off> - Auto read messages
┃ │ ${prefix}anticall <on/off> - Anti-call
┃ │ ${prefix}antidelete <on/off> - Anti-delete
┃ ╰─────────────────
┃
┃ ╭─「 *Privacy* 」
┃ │ ${prefix}pmblocker <on/off> - PM blocker
┃ │ ${prefix}pmblocker setmsg <text> - Set PM message
┃ │ ${prefix}pmblocker status - Check status
┃ │ ${prefix}mention <on/off> - Auto mention reply
┃ │ ${prefix}setmention - Set mention message
┃ ╰─────────────────
┃
┗━━━━━━━━━━━━━━━━━━━━━

🔐 *Access:* Owner only commands
⚡ *Power:* Full bot control`,

        media: `
┏━━━『 ${categoryIcons.media} *MEDIA* 』━━━┓
┃
┃ ╭─「 *Stickers* 」
┃ │ ${prefix}sticker - Image to sticker
┃ │ ${prefix}take <packname> - Steal sticker
┃ │ ${prefix}tgsticker <link> - Telegram sticker
┃ │ ${prefix}attp <text> - Animated text
┃ │ ${prefix}emojimix <e1>+<e2> - Mix emojis
┃ ╰─────────────────
┃
┃ ╭─「 *Image Editing* 」
┃ │ ${prefix}blur - Blur image
┃ │ ${prefix}removebg - Remove background
┃ │ ${prefix}remini - HD enhance
┃ │ ${prefix}crop - Crop image
┃ │ ${prefix}simage - Sticker to image
┃ │ ${prefix}meme - Random meme
┃ ╰─────────────────
┃
┃ ╭─「 *Instagram* 」
┃ │ ${prefix}igs <link> - Instagram download
┃ │ ${prefix}igsc <link> - IG with caption
┃ ╰─────────────────
┃
┃ ╭─「 *Photo Collections* 」
┃ │ ${prefix}pies <country> - Country pics
┃ │ ${prefix}china - Chinese beauty
┃ │ ${prefix}indonesia - Indonesian beauty
┃ │ ${prefix}japan - Japanese beauty
┃ │ ${prefix}korea - Korean beauty
┃ │ ${prefix}hijab - Hijab collection
┃ ╰─────────────────
┃
┗━━━━━━━━━━━━━━━━━━━━━

🎨 *Quality:* HD image processing
⚡ *Speed:* Fast rendering`,

        ai: `
┏━━━『 ${categoryIcons.ai} *ARTIFICIAL INTELLIGENCE* 』━━━┓
┃
┃ ╭─「 *AI Chat* 」
┃ │ ${prefix}gpt <question> - ChatGPT AI
┃ │ ${prefix}gemini <question> - Google Gemini
┃ │ ${prefix}8ball <question> - Magic 8 ball
┃ ╰─────────────────
┃
┃ ╭─「 *AI Image Generation* 」
┃ │ ${prefix}imagine <prompt> - Generate image
┃ │ ${prefix}flux <prompt> - Flux AI image
┃ │ ${prefix}sora <prompt> - Sora AI video
┃ ╰─────────────────
┃
┗━━━━━━━━━━━━━━━━━━━━━

🤖 *Powered by:* Latest AI models
💡 *Smart:* Context-aware responses`,

        fun: `
┏━━━『 ${categoryIcons.fun} *FUN & GAMES* 』━━━┓
┃
┃ ╭─「 *Games* 」
┃ │ ${prefix}tictactoe @user - Play TicTacToe
┃ │ ${prefix}hangman - Hangman game
┃ │ ${prefix}guess <letter> - Guess letter
┃ │ ${prefix}trivia - Trivia quiz
┃ │ ${prefix}answer <ans> - Answer trivia
┃ │ ${prefix}truth - Truth question
┃ │ ${prefix}dare - Dare challenge
┃ ╰─────────────────
┃
┃ ╭─「 *Fun Interactions* 」
┃ │ ${prefix}compliment @user - Compliment someone
┃ │ ${prefix}insult @user - Roast someone
┃ │ ${prefix}flirt - Flirt message
┃ │ ${prefix}shayari - Hindi poetry
┃ │ ${prefix}goodnight - Goodnight wish
┃ │ ${prefix}roseday - Rose day special
┃ ╰─────────────────
┃
┃ ╭─「 *Fun Edits* 」
┃ │ ${prefix}character @user - Character analysis
┃ │ ${prefix}wasted @user - Wasted meme
┃ │ ${prefix}ship @user - Ship calculator
┃ │ ${prefix}simp @user - Simp meter
┃ │ ${prefix}stupid @user [text] - Stupid meme
┃ ╰─────────────────
┃
┗━━━━━━━━━━━━━━━━━━━━━

🎮 *Games:* Multiplayer supported
😂 *Fun:* Entertainment guaranteed`,

        download: `
┏━━━『 ${categoryIcons.downloader} *DOWNLOADER* 』━━━┓
┃
┃ ╭─「 *YouTube* 」
┃ │ ${prefix}play <song> - Play audio
┃ │ ${prefix}song <name> - Download song
┃ │ ${prefix}video <name> - Download video
┃ │ ${prefix}ytmp4 <link> - YouTube MP4
┃ ╰─────────────────
┃
┃ ╭─「 *Social Media* 」
┃ │ ${prefix}spotify <query> - Spotify download
┃ │ ${prefix}instagram <link> - Instagram download
┃ │ ${prefix}facebook <link> - Facebook download
┃ │ ${prefix}tiktok <link> - TikTok download
┃ ╰─────────────────
┃
┗━━━━━━━━━━━━━━━━━━━━━

📥 *Quality:* HD downloads
⚡ *Speed:* Ultra-fast processing`,

        maker: `
┏━━━『 ${categoryIcons.maker} *TEXT MAKER* 』━━━┓
┃
┃ ╭─「 *Logo Styles* 」
┃ │ ${prefix}metallic <text> - Metallic effect
┃ │ ${prefix}ice <text> - Ice effect
┃ │ ${prefix}snow <text> - Snow effect
┃ │ ${prefix}impressive <text> - Impressive style
┃ │ ${prefix}matrix <text> - Matrix effect
┃ │ ${prefix}light <text> - Light effect
┃ │ ${prefix}neon <text> - Neon glow
┃ │ ${prefix}devil <text> - Devil style
┃ │ ${prefix}purple <text> - Purple effect
┃ │ ${prefix}thunder <text> - Thunder bolt
┃ │ ${prefix}leaves <text> - Leaves effect
┃ │ ${prefix}1917 <text> - 1917 style
┃ │ ${prefix}arena <text> - Arena effect
┃ │ ${prefix}hacker <text> - Hacker style
┃ │ ${prefix}sand <text> - Sand writing
┃ │ ${prefix}blackpink <text> - Blackpink style
┃ │ ${prefix}glitch <text> - Glitch effect
┃ │ ${prefix}fire <text> - Fire text
┃ ╰─────────────────
┃
┗━━━━━━━━━━━━━━━━━━━━━

✨ *Effects:* 17+ unique styles
🎨 *Quality:* Professional logos`,

        anime: `
┏━━━『 ${categoryIcons.anime} *ANIME ZONE* 』━━━┓
┃
┃ ╭─「 *Anime Reactions* 」
┃ │ ${prefix}nom - Nom nom animation
┃ │ ${prefix}poke - Poke someone
┃ │ ${prefix}cry - Crying anime
┃ │ ${prefix}kiss - Kiss animation
┃ │ ${prefix}pat - Pat head
┃ │ ${prefix}hug - Hug animation
┃ │ ${prefix}wink - Wink animation
┃ │ ${prefix}facepalm - Facepalm reaction
┃ ╰─────────────────
┃
┃ ╭─「 *Anime Memes* 」
┃ │ ${prefix}nom - Eating animation
┃ │ ${prefix}oogway - Master Oogway quote
┃ │ ${prefix}lolice - Lolice meme
┃ │ ${prefix}namecard - Anime namecard
┃ ╰─────────────────
┃
┗━━━━━━━━━━━━━━━━━━━━━

🎭 *Collection:* 12+ anime reactions
⭐ *Quality:* HD anime GIFs`,

        dev: `
┏━━━『 ${categoryIcons.github} *DEVELOPER* 』━━━┓
┃
┃ ╭─「 *Repository* 」
┃ │ ${prefix}git - GitHub repo
┃ │ ${prefix}github - GitHub link
┃ │ ${prefix}sc - Script info
┃ │ ${prefix}script - Bot script
┃ │ ${prefix}repo - Repository details
┃ ╰─────────────────
┃
┗━━━━━━━━━━━━━━━━━━━━━

💻 *Source:* Open source available
⭐ *Star:* Support the project on GitHub`
    };

    const categoryMenu = menus[category];
    
    if (!categoryMenu) {
        await sock.sendMessage(chatId, { 
            text: `❌ Invalid category: *$${category}*\n\nUse$$ {prefix}menu to see all categories.`
        }, { quoted: message });
        return;
    }

    try {
        await sock.sendMessage(chatId, {
            text: categoryMenu,
            contextInfo: {
                externalAdReply: {
                    title: `${categoryIcons[category]} ${category.toUpperCase()} COMMANDS`,
                    body: `Ladybug X2 | ${stats.uptime}`,
                    thumbnailUrl: 'https://i.imgur.com/your-thumbnail.jpg',
                    sourceUrl: global.ytch || 'https://youtube.com',
                    mediaType: 1,
                    renderLargerThumbnail: true
                },
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363161513685998@newsletter',
                    newsletterName: '⚡ Ladybug X2 Commands',
                    serverMessageId: -1
                }
            }
        }, { quoted: message });
    } catch (error) {
        console.error('Error sending category menu:', error);
        await sock.sendMessage(chatId, { text: categoryMenu }, { quoted: message });
    }
}

module.exports = helpCommand;
