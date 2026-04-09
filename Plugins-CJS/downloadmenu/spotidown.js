/**
 * Plugin: spotidown.js
 * Description: Download lagu dari Spotify
 * Command: .spotify, .spotidown
 */

const { getBuffer, fetchJson } = require('../Library/myfunction')
const axios = require('axios')

const handler = async (m, Obj) => {
  const { conn, q, button, text } = Obj

  if (!text) {
    const helpText = `
╭━━━❰ *SPOTIFY DOWNLOADER* ❱━━━╮
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ .spotify Judul Lagu
┃ .spotidown Judul Lagu
┃
┃ *Contoh:*
┃ .spotify Blinding Lights
┃ .spotify https://open.spotify.com/track/...
┃
┃ 🎧 *Fitur:*
┃ • Cari lagu di Spotify
┃ • Download audio MP3
┃ • Metadata lengkap
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.quickReply("🎵 YouTube Music", ".play"),
      ...button.flow.quickReply("🎬 YouTube Video", ".ytvideo"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    return button.sendInteractive(helpText, buttons, {
      title: "Spotify Downloader",
      body: "Download lagu Spotify"
    })
  }

  try {
    await conn.sendMessage(m.chat, {
      text: `🔍 Mencari di Spotify: *${text}*...`
    }, { quoted: q('fkontak') })

    let trackData
    const isUrl = text.includes('open.spotify.com')

    if (isUrl) {
      // Extract track ID
      const trackId = text.match(/track\/([a-zA-Z0-9]+)/)?.[1]
      if (!trackId) {
        return conn.sendMessage(m.chat, {
          text: "❌ URL Spotify tidak valid!"
        }, { quoted: q('fkontak') })
      }

      // Get track info
      const apiUrl = `https://api.spotifydown.com/metadata/track/${trackId}`
      trackData = await axios.get(apiUrl, {
        headers: {
          'Origin': 'https://spotifydown.com',
          'Referer': 'https://spotifydown.com/'
        }
      }).then(res => res.data).catch(() => null)
    } else {
      // Search track
      const searchUrl = `https://api.spotifydown.com/search?q=${encodeURIComponent(text)}`
      const searchResult = await axios.get(searchUrl, {
        headers: {
          'Origin': 'https://spotifydown.com',
          'Referer': 'https://spotifydown.com/'
        }
      }).then(res => res.data).catch(() => null)

      if (!searchResult || !searchResult.tracks || searchResult.tracks.length === 0) {
        return conn.sendMessage(m.chat, {
          text: "❌ Lagu tidak ditemukan di Spotify!"
        }, { quoted: q('fkontak') })
      }

      trackData = searchResult.tracks[0]
    }

    if (!trackData) {
      return conn.sendMessage(m.chat, {
        text: "❌ Gagal mendapatkan data lagu!"
      }, { quoted: q('fkontak') })
    }

    const { title, artists, album, cover, id } = trackData
    const artistName = Array.isArray(artists) ? artists.map(a => a.name).join(', ') : artists

    // Info message
    const infoText = `
╭━━━❰ *SPOTIFY TRACK* ❱━━━╮
┃
┃ 🎵 *${title}*
┃
┃ 🎤 Artist: ${artistName}
┃ 💿 Album: ${album?.name || 'Single'}
┃
┃ ⏳ Sedang mendownload...
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    await conn.sendMessage(m.chat, {
      image: { url: cover },
      caption: infoText
    }, { quoted: m })

    // Download
    try {
      const downloadUrl = `https://api.spotifydown.com/download/${id}`
      const downloadData = await axios.get(downloadUrl, {
        headers: {
          'Origin': 'https://spotifydown.com',
          'Referer': 'https://spotifydown.com/'
        }
      }).then(res => res.data).catch(() => null)

      if (downloadData && downloadData.link) {
        const audioBuffer = await getBuffer(downloadData.link)

        await conn.sendMessage(m.chat, {
          audio: audioBuffer,
          mimetype: 'audio/mp4',
          ptt: false,
          contextInfo: {
            externalAdReply: {
              title: title,
              body: artistName,
              thumbnailUrl: cover,
              sourceUrl: `https://open.spotify.com/track/${id}`,
              mediaType: 1
            }
          }
        }, { quoted: m })

        // Success buttons
        const buttons = [
          ...button.flow.ctaUrl("🔗 Buka Spotify", `https://open.spotify.com/track/${id}`),
          ...button.flow.quickReply("🎵 YouTube", `.play ${title} ${artistName}`),
          ...button.flow.quickReply("📋 Menu", ".menuplug")
        ]

        await button.sendInteractive(`✅ *${title}* berhasil dikirim!`, buttons, {
          title: "Download Complete",
          body: `${title} - ${artistName}`
        })
      } else {
        throw new Error('Download link not found')
      }
    } catch (dlErr) {
      // Fallback
      const buttons = [
        ...button.flow.ctaUrl("🔗 Buka Spotify", `https://open.spotify.com/track/${id}`),
        ...button.flow.quickReply("🎵 YouTube", `.play ${title}`),
        ...button.flow.quickReply("📋 Menu", ".menuplug")
      ]

      await button.sendInteractive(
        `⚠️ Download gagal, tapi lagu ditemukan!\n\n🎵 *${title}*\n🎤 ${artistName}`,
        buttons,
        { title: "Track Found", body: "Click to open Spotify" }
      )
    }

  } catch (err) {
    console.error("Spotify Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Gagal mendownload: " + err.message
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['spotify']
handler.tags = ['download']
handler.command = ['spotify', 'spotidown', 'spotidl']
handler.limit = true

module.exports = handler
