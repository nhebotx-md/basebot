/**
 * Plugin: spotidown.js
 * Description: Download lagu dari Spotify
 * Command: .spotify, .spotidown
 */

const axios = require('axios');
const { getBuffer } = require('../Library/myfunction');

const handler = async (m, Obj) => {
    const { conn, q, button, text, replyAdaptive } = Obj;

    if (!text) {
        const helpText = `
╭━━━❰ *SPOTIFY DOWNLOAD* ❱━━━╮
┃
┃ 🎧 Download lagu dari Spotify
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ .spotify <judul lagu>
┃ .spotify <link spotify>
┃
┃ *Contoh:*
┃ .spotify Perfect Ed Sheeran
┃ .spotify https://open.spotify.com/track/...
┃
┃ 🎵 *Fitur:*
┃ • Cari lagu di Spotify
┃ • Download audio MP3
┃ • High quality
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const buttons = [
            ...button.flow.quickReply("🎵 Play YouTube", ".play"),
            ...button.flow.quickReply("🎬 YouTube Video", ".ytvideo"),
            ...button.flow.quickReply("📋 Menu", ".menuplug")
        ];

        return replyAdaptive({
            text: helpText,
            buttons: buttons,
            title: "Spotify Download",
            body: "Download lagu Spotify"
        });
    }

    try {
        await conn.sendMessage(m.chat, {
            text: `🔍 Mencari di Spotify: *${text}*...`
        }, { quoted: q('fkontak') });

        // Determine if input is URL or search query
        const isUrl = text.includes('open.spotify.com');
        let searchUrl;

        if (isUrl) {
            searchUrl = `https://api.ryzendesu.vip/api/downloader/spotify?url=${encodeURIComponent(text)}`;
        } else {
            searchUrl = `https://api.ryzendesu.vip/api/search/spotify?q=${encodeURIComponent(text)}`;
        }

        // Search/download from Spotify
        const response = await axios.get(searchUrl, {
            timeout: 60000
        });

        const data = response.data;

        if (!data || data.error) {
            throw new Error(data?.error || 'Lagu tidak ditemukan');
        }

        // Handle search results
        let trackData;
        if (Array.isArray(data) && data.length > 0) {
            trackData = data[0];
        } else if (data.data) {
            trackData = data.data;
        } else {
            trackData = data;
        }

        const { title, artist, album, thumbnail, url: trackUrl } = trackData;

        // Send info
        const infoText = `
╭━━━❰ *SPOTIFY TRACK* ❱━━━╮
┃
┃ 🎵 *${title || 'Unknown'}*
┃
┃ 👤 *Artist:* ${artist || 'Unknown'}
┃ 💿 *Album:* ${album || 'Unknown'}
┃
┃ ⬇️ Sedang download...
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        await conn.sendMessage(m.chat, {
            image: { url: thumbnail || global.thumbnail },
            caption: infoText
        }, { quoted: q('fkontak') });

        // Get download URL
        let downloadUrl = trackData.downloadUrl || trackData.url;
        
        // If no direct download, try to get from downloader API
        if (!downloadUrl && trackUrl) {
            const downloadResponse = await axios.get(`https://api.ryzendesu.vip/api/downloader/spotify?url=${encodeURIComponent(trackUrl)}`, {
                timeout: 60000
            });
            downloadUrl = downloadResponse.data?.downloadUrl || downloadResponse.data?.url;
        }

        if (!downloadUrl) {
            throw new Error('Download URL not available');
        }

        // Download audio
        const audioBuffer = await getBuffer(downloadUrl);

        // Send audio
        await conn.sendMessage(m.chat, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            fileName: `${title || 'Spotify Track'}.mp3`,
            contextInfo: {
                externalAdReply: {
                    title: title || 'Spotify Track',
                    body: `By ${artist || 'Unknown'}`,
                    thumbnailUrl: thumbnail || global.thumbnail,
                    sourceUrl: trackUrl || 'https://spotify.com',
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: q('fkontak') });

    } catch (error) {
        console.error('Spotify Error:', error);
        return replyAdaptive({
            text: `❌ *Error:* ${error.message || 'Gagal download lagu'}`,
            title: "Error",
            body: "Spotify Download Failed"
        });
    }
};

handler.command = ['spotify', 'spotidown', 'spdl'];
handler.tags = ['download'];
handler.help = ['spotify <judul/link>'];

module.exports = handler;
