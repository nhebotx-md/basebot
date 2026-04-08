/**
 * Spotify Downloader Plugin
 * Category: downloadmenu
 * Feature: Download lagu dari Spotify
 */

const axios = require('axios')

const handler = async (m, Obj) => {
  const { conn, q, args, text } = Obj

  if (!text) {
    return conn.sendMessage(m.chat, {
      text: "❌ Masukkan URL Spotify atau judul lagu!",
      footer: "Spotify Downloader",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Cara Pakai",
            id: ".spotify help"
          })
        }
      ]
    }, { quoted: q('fkontak') })
  }

  if (text.toLowerCase() === 'help') {
    return conn.sendMessage(m.chat, {
      text: `
╭───〔 *SPOTIFY DOWNLOADER* 〕───╮
│
│ 📋 *Cara Penggunaan:*
│
│ .spotify [URL Spotify]
│ .spotify [judul lagu]
│
│ 📌 *Contoh:*
│ • .spotify https://open.spotify.com/track/xxxxx
│ • .spotify Blinding Lights
│ • .spotify Shape of You
│
│ 🎵 *Fitur:*
│ • Download lagu Spotify
│ • Metadata lengkap
│ • Kualitas tinggi
│
╰────────────────────────────╯
      `.trim()
    }, { quoted: q('fkontak') })
  }

  try {
    // Cek apakah input adalah URL Spotify
    const spotifyUrlRegex = /https?:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]+/
    const isUrl = spotifyUrlRegex.test(text)

    await conn.sendMessage(m.chat, {
      text: isUrl ? "⏳ Mengunduh dari Spotify..." : `🔍 Mencari: *${text}*...`
    }, { quoted: q('fkontak') })

    let trackData

    if (isUrl) {
      // Extract track ID dari URL
      const trackId = text.match(/track\/([a-zA-Z0-9]+)/)?.[1]
      
      if (!trackId) {
        return conn.sendMessage(m.chat, {
          text: "❌ URL Spotify tidak valid!"
        }, { quoted: q('fkontak') })
      }

      // Gunakan API untuk get track info
      const apiUrl = `https://api.spotifydown.com/metadata/track/${trackId}`
      
      try {
        const response = await axios.get(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 30000
        })
        
        trackData = response.data
      } catch (apiErr) {
        console.error("Spotify API Error:", apiErr)
        
        // Fallback: info dasar
        trackData = {
          title: 'Spotify Track',
          artists: [{ name: 'Unknown Artist' }],
          album: { name: 'Unknown Album', images: [{ url: 'https://files.catbox.moe/5x2b8n.jpg' }] },
          duration_ms: 0,
          external_urls: { spotify: text }
        }
      }
    } else {
      // Search Spotify
      try {
        const searchUrl = `https://api.spotifydown.com/search?q=${encodeURIComponent(text)}`
        const searchResponse = await axios.get(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 30000
        })
        
        if (searchResponse.data && searchResponse.data.tracks && searchResponse.data.tracks.items.length > 0) {
          trackData = searchResponse.data.tracks.items[0]
        } else {
          return conn.sendMessage(m.chat, {
            text: "❌ Lagu tidak ditemukan di Spotify!"
          }, { quoted: q('fkontak') })
        }
      } catch (searchErr) {
        console.error("Spotify Search Error:", searchErr)
        return conn.sendMessage(m.chat, {
          text: "❌ Gagal mencari lagu! Coba lagi nanti."
        }, { quoted: q('fkontak') })
      }
    }

    // Format durasi
    const durationMin = Math.floor((trackData.duration_ms || 0) / 60000)
    const durationSec = Math.floor(((trackData.duration_ms || 0) % 60000) / 1000)
    const duration = `${durationMin}:${durationSec.toString().padStart(2, '0')}`

    // Kirim info track dengan button
    const infoText = `
╭───〔 *SPOTIFY TRACK* 〕───╮
│
│ 🎵 *${trackData.title || trackData.name}*
│
│ 🎤 Artist: ${trackData.artists?.map(a => a.name).join(', ') || 'Unknown'}
│ 💿 Album: ${trackData.album?.name || 'Unknown'}
│ ⏱️ Durasi: ${duration}
│
╰─────────────────────────╯
    `.trim()

    const thumbnail = trackData.album?.images?.[0]?.url || 'https://files.catbox.moe/5x2b8n.jpg'

    await conn.sendMessage(m.chat, {
      image: { url: thumbnail },
      caption: infoText,
      footer: "Spotify Downloader",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "🎵 Download Audio",
            id: `.spotifydl ${trackData.id || text}`
          })
        },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "🎧 Buka di Spotify",
            url: trackData.external_urls?.spotify || text,
            merchant_url: trackData.external_urls?.spotify || text
          })
        }
      ]
    }, { quoted: q('fkontak') })

    // Auto download
    await conn.sendMessage(m.chat, {
      text: "⏳ Mengunduh audio..."
    }, { quoted: q('fkontak') })

    try {
      // Gunakan API download
      const downloadUrl = `https://api.spotifydown.com/download/${trackData.id || text}`
      const downloadResponse = await axios.get(downloadUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 60000
      })

      if (downloadResponse.data && downloadResponse.data.link) {
        // Download file audio
        const audioResponse = await axios.get(downloadResponse.data.link, {
          responseType: 'arraybuffer',
          timeout: 120000
        })

        await conn.sendMessage(m.chat, {
          audio: Buffer.from(audioResponse.data),
          mimetype: 'audio/mpeg',
          fileName: `${trackData.title || trackData.name}.mp3`,
          contextInfo: {
            externalAdReply: {
              title: trackData.title || trackData.name,
              body: `🎤 ${trackData.artists?.map(a => a.name).join(', ')}`,
              thumbnailUrl: thumbnail,
              mediaType: 2,
              renderLargerThumbnail: true
            }
          }
        }, { quoted: m })
      } else {
        throw new Error('Download link not available')
      }
    } catch (downloadErr) {
      console.error("Download Error:", downloadErr)
      
      await conn.sendMessage(m.chat, {
        text: `⚠️ Gagal mengunduh otomatis.\n\nSilakan download manual:\n${trackData.external_urls?.spotify || text}`,
        footer: "Download Manual"
      }, { quoted: q('fkontak') })
    }

  } catch (err) {
    console.error("SpotifyDown Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Terjadi kesalahan! Coba lagi nanti."
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['spotify', 'spotidown', 'spdl']
handler.tags = ['downloadmenu']
handler.command = ["spotify", "spotidown", "spdl"]
handler.limit = true

module.exports = handler
