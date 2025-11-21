const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function helpCommand(sock, chatId, message) {
    const helpMessage = `
╭───⊳ *ɴᴛᴀɴᴅᴏ ᴏꜰᴄ🎐* ⊲───╮
│                          │
│         X2              │
│                          │
╰───⊳ *ɴᴛᴀɴᴅᴏ ᴏꜰᴄ🎐* ⊲──╯

🔸  *GENERAL*
➥ .menu / .help
➥ .alive / .ping
➥ .runtime / .uptime
➥ .owner / .support
➥ .info / .botinfo
➥ .rank / .level
➥ .profile [@user]
➥ .weather <city>
➥ .news [category]
➥ .quote / .motivate
➥ .joke / .meme
➥ .fact / .trivia
➥ .8ball <question>
➥ .calculator <expr>
➥ .translate <lang> <text>
➥ .lyrics <song>
➥ .wiki <query>
➥ .define <word>
➥ .jid / .id
➥ .url <reply>
➥ .screenshot <url>

🔸  *SECURITY*
➥ .antilink <on/off>
➥ .antispam <on/off>
➥ .antibot <on/off>
➥ .antitag <on/off>
➥ .antinsfw <on/off>
➥ .antiforeign <on/off>
➥ .antibadword <on/off>
➥ .antidelete <on/off>
➥ .antitoxic <on/off>
➥ .antivirus <scan>
➥ .blacklist <add/remove>
➥ .whitelist <add/remove>
➥ .filter <word>
➥ .security <status>
➥ .encryption <check>

🔸  *ADMIN*
➥ .promote @user
➥ .demote @user
➥ .kick @user
➥ .add <number>
➥ .ban @user
➥ .unban @user
➥ .warn @user [reason]
➥ .unwarn @user
➥ .warnings @user
➥ .mute <time>
➥ .unmute
➥ .delete / .del
➥ .purge <number>
➥ .groupinfo
➥ .admins / .staff
➥ .tagall [text]
➥ .hidetag <text>
➥ .totag <reply>
➥ .invite <number>
➥ .revoke / .resetlink
➥ .lock / .unlock
➥ .setname <name>
➥ .setdesc <desc>
➥ .seticon <reply>
➥ .announce <text>
➥ .poll <question|opt1|opt2>

🔸  *FUN & GAMES*
➥ .truth / .dare
➥ .wyr (would you rather)
➥ .ship @user1 @user2
➥ .character @user
➥ .simp @user
➥ .roast @user
➥ .compliment @user
➥ .flirt [@user]
➥ .iq @user
➥ .gay @user
➥ .sigma @user
➥ .hack @user
➥ .tictactoe @user
➥ .rps <r/p/s>
➥ .slot / .spin
➥ .dice / .roll
➥ .flip / .coin
➥ .number <1-100>
➥ .math <level>
➥ .quiz [category]

🔸  *AI POWERED*
➥ .ai <prompt>
➥ .gpt <question>
➥ .chatgpt <query>
➥ .gemini <question>
➥ .bard <query>
➥ .blackbox <code>
➥ .imagine <prompt>
➥ .dalle <prompt>
➥ .flux <description>
➥ .stablediff <prompt>
➥ .aiimage <text>
➥ .enhance <reply img>
➥ .colorize <reply img>
➥ .upscale <reply img>
➥ .removebg <reply img>
➥ .blur <reply img>

🔸  *DOWNLOADER*
➥ .play <song>
➥ .song <name>
➥ .video <name>
➥ .ytmp3 <url>
➥ .ytmp4 <url>
➥ .ytdoc <url>
➥ .yts <query>
➥ .spotify <url/name>
➥ .instagram <url>
➥ .tiktok <url>
➥ .facebook <url>
➥ .twitter <url>
➥ .threads <url>
➥ .pinterest <url>
➥ .mediafire <url>
➥ .gdrive <url>
➥ .apk <name>
➥ .gitclone <url>

🔸  MEDIA TOOLS*
➥ .sticker <reply>
➥ .steal <reply sticker>
➥ .take <pack|author>
➥ .toimg <reply sticker>
➥ .tomp3 <reply video>
➥ .tovideo <reply img>
➥ .togif <reply video>
➥ .tourl <reply media>
➥ .emojimix <😊+😂>
➥ .attp <text>
➥ .ttp <text>
➥ .crop <reply img>
➥ .circle <reply img>
➥ .round <reply img>
➥ .beautiful <reply img>
➥ .jail <reply img>
➥ .wasted <reply img>
➥ .triggered <reply img>

🔸  *ANIME*
➥ .anime <name>
➥ .manga <name>
➥ .character <name>
➥ .waifu / .neko
➥ .hug @user
➥ .kiss @user
➥ .pat @user
➥ .slap @user
➥ .cuddle @user
➥ .poke @user
➥ .feed @user
➥ .tickle @user
➥ .cry / .smile
➥ .dance / .wave

🔸  *TEXT MAKER*
➥ .glow <text>
➥ .3d <text>
➥ .neon <text>
➥ .fire <text>
➥ .ice <text>
➥ .thunder <text>
➥ .matrix <text>
➥ .sand <text>
➥ .blood <text>
➥ .graffiti <text>
➥ .metal <text>
➥ .gold <text>
➥ .glitch <text>
➥ .space <text>
➥ .neonlight <text>

🔸  *TOOLS*
➥ .stalk <username>
➥ .nowa <number>
➥ .truecaller <number>
➥ .whois <domain>
➥ .ip <address>
➥ .short <url>
➥ .qr <text>
➥ .readqr <reply>
➥ .barcode <text>
➥ .encode <text>
➥ .decode <code>
➥ .hash <text>
➥ .carbon <code>
➥ .pastebin <text>
➥ .tempmail

🔸  *PREMIUM*
➥ .premium <status>
➥ .buypremium
➥ .redeem <code>
➥ .vip <features>
➥ .unlimited <access>
➥ .priority <support>
➥ .custom <command>

🔸  *OWNER ONLY*
➥ .mode <public/private>
➥ .self / .public
➥ .join <link>
➥ .leave [chat]
➥ .block @user
➥ .unblock @user
➥ .broadcast <text>
➥ .setbio <text>
➥ .setname <name>
➥ .setpp <reply>
➥ .restart / .reboot
➥ .update / .upgrade
➥ .backup / .restore
➥ .eval <code>
➥ .exec <command>
➥ .shell <cmd>
➥ .addprem @user
➥ .delprem @user
➥ .listprem
➥ .ban @user
➥ .unban @user
➥ .banlist
➥ .cleartmp
➥ .clearsession
➥ .getcase <cmd>
➥ .getsession

🔸  *STATISTICS*
➥ .stats / .analytics
➥ .leaderboard / .top
➥ .rank / .level
➥ .serverinfo
➥ .groupstats
➥ .userstats [@user]

🔸  *STORE & SUPPORT*
➥ .store - View our services
➥ .services - Detailed service list
➥ .support - Get help & contact info
┗━━━━━━━━━━━━━━━━━━━┛


 ╭───⊳ *ɴᴛᴀɴᴅᴏ ᴏꜰᴄ🎐* ⊲───╮
│                          │
│  *⏩, 🔐, 🤖*           │
╰───⊳ *https://ntandostore.zone.id🎐* ⊲──╯

> © 2024 *LADYBUG X* - All Rights Reserved
> *Powered by Advanced Security Systems*`;

    try {
        const imagePath = path.join(__dirname, '../assets/ladybug_logo.jpg');
        
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: helpMessage,
                contextInfo: {
                    externalAdReply: {
                        title: '🐞 LADYBUG X - PREMIUM BOT',
                        body: '🛡️ Secured • Smart • Reliable',
                        thumbnailUrl: 'https://i.ibb.co/example/ladybug.jpg', // Replace with actual URL
                        sourceUrl: global.channel || 'https://github.com',
                        mediaType: 1,
                        renderLargerThumbnail: true
                    },
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363161',
                        newsletterName: '🐞 LADYBUG X SECURITY',
                        serverMessageId: -1
                    }
                }
            }, { quoted: message });
        } else {
            console.log('⚠️ Logo not found, sending text menu...');
            await sock.sendMessage(chatId, { 
                text: helpMessage,
                contextInfo: {
                    externalAdReply: {
                        title: '🐞 LADYBUG X - PREMIUM BOT',
                        body: '🛡️ Secured • Smart • Reliable',
                        thumbnailUrl: 'https://i.ibb.co/example/ladybug.jpg',
                        sourceUrl: global.channel || 'https://github.com',
                        mediaType: 1,
                        renderLargerThumbnail: true
                    },
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363161513685998@newsletter',
                        newsletterName: '🐞 LADYBUG X SECURITY',
                        serverMessageId: -1
                    }
                }
            }, { quoted: message });
        }
    } catch (error) {
        console.error('❌ Error in help command:', error);
        await sock.sendMessage(chatId, { 
            text: '⚠️ Error loading menu. Please try again.\n\n' + helpMessage 
        });
    }
}

module.exports = helpCommand;
