/**
 * Plugin: ytvideo.js
 * Description: Download video dari YouTube
 * Command: .ytvideo, .ytv, .video
 */

const yts = require('yt-search');
const { getBuffer } = require('../Library/myfunction');

const handler = async (m, Obj) => {
    const { conn, q, button, text, replyAdaptive } = Obj;

    if (!text) {
        const helpText = `
╭━━━❰ *YOUTUBE VIDEO* ❱━━━╮
┃
┃ 🎬 Download video YouTube
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ .ytvideo <judul/link>
┃ .ytv <judul/link>
┃
┃ *Contoh:*
┃ .ytvideo Alan Walker Faded
┃ .ytv https://youtube.com/watch?v=...
┃
┃ 🎬 *Fitur:*
┃ • Cari video di YouTube
┃ • Download video MP4
┃ • High quality
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("🎵 Play YouTube", ".play"),
            ...button.flow.quickReply("🎧 Spotify", ".spotify"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: helpText,
            buttons: buttons,
            title: "YouTube Video",
            body: "Download video YouTube"
        });
    }

    try {
        await conn.sendMessage(m.chat, {
            text: `🔍 Mencari video: *${text}*...`
        }, { quoted: q('fkontak') });

        let videoUrl = text;
        let videoInfo;

        // If not URL, search
        if (!text.includes('youtube.com') && !text.includes('youtu.be')) {
            const search = await yts(text);
            const video = search.videos[0];

            if (!video) {
                return replyAdaptive({
                    text: '❌ Video tidak ditemukan!',
                    title: "Error",
                    body: "Video Not Found"
                });
            }

            videoUrl = video.url;
            videoInfo = video;
        } else {
            // Get video info from URL
            const search = await yts({ videoId: text.split('v=')[1] || text.split('/').pop() });
            videoInfo = search;
        }

        const { title, url, timestamp, views, author, thumbnail, ago } = videoInfo;

        // Send info message
        const infoText = `
╭━━━❰ *VIDEO FOUND* ❱━━━╮
┃
┃ 🎬 *${title}*
┃
┃ 👤 *Channel:* ${author?.name || 'Unknown'}
┃ ⏱️ *Duration:* ${timestamp}
┃ 👁️ *Views:* ${views?.toLocaleString() || 'Unknown'}
┃ 📅 *Uploaded:* ${ago || 'Unknown'}
┃
┃ ⬇️ Sedang download...
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        await conn.sendMessage(m.chat, {
            image: { url: thumbnail },
            caption: infoText
        }, { quoted: q('fkontak') });

        // Download video using SaveTube
        const SaveTube = require('../Library/savetube');
        const ytdl = new SaveTube();
        
        const downloadData = await ytdl.download(url, '720');
        
        if (!downloadData || !downloadData.downloadUrl) {
            throw new Error('Failed to get download URL');
        }

        // Get video buffer
        const videoBuffer = await getBuffer(downloadData.downloadUrl);

        // Send video
        await conn.sendMessage(m.chat, {
            video: videoBuffer,
            mimetype: 'video/mp4',
            fileName: `${title}.mp4`,
            caption: `
╭━━━❰ *VIDEO DOWNLOADED* ❱━━━╮
┃
┃ 🎬 *${title}*
┃ 👤 *By:* ${author?.name || 'Unknown'}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: `By ${author?.name || 'Unknown'}`,
                    thumbnailUrl: thumbnail,
                    sourceUrl: url,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: q('fkontak') });

    } catch (error) {
        console.error('YouTube Video Error:', error);
        return replyAdaptive({
            text: `❌ *Error:* ${error.message || 'Gagal download video'}`,
            title: "Error",
            body: "Video Download Failed"
        });
    }
};

handler.command = ['ytvideo', 'ytv', 'video', 'ytmp4'];
handler.tags = ['download'];
handler.help = ['ytvideo <judul/link>'];

module.exports = handler;
