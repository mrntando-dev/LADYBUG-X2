const fetch = require('node-fetch');

async function lyricsCommand(sock, chatId, songTitle, message) {
    if (!songTitle) {
        await sock.sendMessage(chatId, { 
            text: `╭━━━〔 🐞 𝐋𝐘𝐑𝐈𝐂𝐒 〕━━━╮
┃
┃  ❌ *Missing Song Title!*
┃
┃  📝 *Usage:*
┃  lyrics <song name>
┃
┃  💡 *Example:*
┃  lyrics Shape of You
┃
╰━━━━━━━━━━━━━━━━━━╯`
        }, { quoted: message });
        return;
    }

    // Send searching message
    const searchMsg = await sock.sendMessage(chatId, { 
        text: `🐞 *Ladybug X2* is searching lyrics for:\n\n🎵 *"${songTitle}"*\n\n⏳ Please wait...`
    }, { quoted: message });

    try {
        // Use lyricsapi.fly.dev
        const apiUrl = `https://lyricsapi.fly.dev/api/lyrics?q=${encodeURIComponent(songTitle)}`;
        const res = await fetch(apiUrl);
        
        if (!res.ok) {
            throw new Error('API request failed');
        }
        
        const data = await res.json();

        // Extract lyrics and metadata
        const lyrics = data?.result?.lyrics;
        const artist = data?.result?.artist || 'Unknown Artist';
        const title = data?.result?.title || songTitle;
        const albumArt = data?.result?.image || null;

        if (!lyrics) {
            await sock.sendMessage(chatId, {
                text: `╭━━━〔 🐞 𝐋𝐘𝐑𝐈𝐂𝐒 〕━━━╮
┃
┃  ❌ *Not Found!*
┃
┃  🎵 Song: ${songTitle}
┃
┃  💡 *Tip:* Try with artist name
┃  Example: lyrics Blinding Lights
┃
╰━━━━━━━━━━━━━━━━━━╯`
            }, { quoted: message });
            return;
        }

        // Format the lyrics with header
        const maxChars = 3800; // Leave room for header
        const truncatedLyrics = lyrics.length > maxChars 
            ? lyrics.slice(0, maxChars) + '\n\n... [Lyrics truncated]' 
            : lyrics;

        const lyricsOutput = `╭━━━〔 🐞 𝐋𝐘𝐑𝐈𝐂𝐒 〕━━━╮
┃
┃  🎵 *Title:* ${title}
┃  🎤 *Artist:* ${artist}
┃
╰━━━━━━━━━━━━━━━━━━╯

${truncatedLyrics}

╭━━━━━━━━━━━━━━━━━━╮
┃  🐞 *Powered by Ladybug X2*
╰━━━━━━━━━━━━━━━━━━╯`;

        // Send album art if available
        if (albumArt) {
            try {
                await sock.sendMessage(chatId, {
                    image: { url: albumArt },
                    caption: lyricsOutput
                }, { quoted: message });
            } catch (imgError) {
                // If image fails, send text only
                await sock.sendMessage(chatId, { 
                    text: lyricsOutput 
                }, { quoted: message });
            }
        } else {
            // Send text only
            await sock.sendMessage(chatId, { 
                text: lyricsOutput 
            }, { quoted: message });
        }

    } catch (error) {
        console.error('Error in lyrics command:', error);
        await sock.sendMessage(chatId, { 
            text: `╭━━━〔 🐞 𝐄𝐑𝐑𝐎𝐑 〕━━━╮
┃
┃  ❌ *Failed to fetch lyrics*
┃
┃  🎵 Song: ${songTitle}
┃
┃  🔧 *Possible Issues:*
┃  • API connection error
┃  • Song not in database
┃  • Invalid song name
┃
┃  💡 Try again or check spelling
┃
╰━━━━━━━━━━━━━━━━━━╯`
        }, { quoted: message });
    }
}

module.exports = { lyricsCommand };
