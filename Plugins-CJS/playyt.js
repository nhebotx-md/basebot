/**
 * Plugin: playyt.js
 * Description: Play & download YouTube audio
 * Command: .play, .playyt
 */

const yts = require('yt-search');
const { getBuffer } = require('../Library/myfunction');

const handler = async (m, Obj) => {
    const { conn, q, button, text, replyAdaptive } = Obj;

    if (!text) {
        const helpText = `
╭━━━❰ *PLAY YOUTUBE* ❱━━━╮
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ .play Judul Lagu
┃ .playyt Judul Lagu
┃
┃ *Contoh:*
┃ .play Alan Walker Faded
┃ .playyt Despacito
┃
┃ 🎵 *Fitur:*
┃ • Cari lagu di YouTube
┃ • Download audio MP3
┃ • High quality
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("🎬 YouTube Video", ".ytvideo"),
            ...button.flow.quickReply("🎧 Spotify", ".spotify"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: helpText,
            buttons: buttons,
            title: "Play YouTube",
            body: "Cari & download lagu"
        });
    }

    try {
        await conn.sendMessage(m.chat, {
            text: `🔍 Mencari: *${text}*...`
        }, { quoted: q('fkontak') });

        // Search YouTube
        const search = await yts(text);
        const video = search.videos[0];

        if (!video) {
            return replyAdaptive({
                text: '❌ Lagu tidak ditemukan!',
                title: "Error",
                body: "Song Not Found"
            });
        }

        const { title, url, timestamp, views, author, thumbnail, ago } = video;

        // Send info message
        const infoText = `
╭━━━❰ *MUSIC FOUND* ❱━━━╮
┃
┃ 🎵 *${title}*
┃
┃ 👤 *Channel:* ${author.name}
┃ ⏱️ *Duration:* ${timestamp}
┃ 👁️ *Views:* ${views.toLocaleString()}
┃ 📅 *Uploaded:* ${ago}
┃
┃ ⬇️ Sedang download...
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        await conn.sendMessage(m.chat, {
            image: { url: thumbnail },
            caption: infoText
        }, { quoted: q('fkontak') });

        // Download audio using SaveTube
        const SaveTube = require('../Library/savetube');
        const ytdl = new SaveTube();
        
        const downloadData = await ytdl.download(url, 'mp3');
        
        if (!downloadData || !downloadData.downloadUrl) {
            throw new Error('Failed to get download URL');
        }

        // Get audio buffer
        const audioBuffer = await getBuffer(downloadData.downloadUrl);

        // Send audio
        await conn.sendMessage(m.chat, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            fileName: `${title}.mp3`,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: `By ${author.name}`,
                    thumbnailUrl: thumbnail,
                    sourceUrl: url,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: q('fkontak') });

    } catch (error) {
        console.error('Play Error:', error);
        return replyAdaptive({
            text: `❌ *Error:* ${error.message || 'Gagal memutar lagu'}`,
            title: "Error",
            body: "Play Failed"
        });
    }
};

handler.command = ['play', 'playyt', 'ytplay'];
handler.tags = ['download'];
handler.help = ['play <judul lagu>'];

module.exports = handler;
