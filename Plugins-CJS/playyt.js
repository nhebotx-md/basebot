/**
 * Play YouTube Plugin
 * Category: downloadmenu
 * Feature: Mencari dan memutar audio dari YouTube
 */

const yts = require('yt-search')
const axios = require('axios')

const handler = async (m, Obj) => {
  const { conn, q, args, text } = Obj

  if (!text) {
    return conn.sendMessage(m.chat, {
      text: "❌ Masukkan judul lagu yang ingin dicari!",
      footer: "YouTube Music Player",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Contoh",
            id: ".play example"
          })
        }
      ]
    }, { quoted: q('fkontak') })
  }

  if (text.toLowerCase() === 'example') {
    return conn.sendMessage(m.chat, {
      text: `
╭───〔 *PLAY YOUTUBE* 〕───╮
│
│ 📋 *Cara Penggunaan:*
│
│ .play [judul lagu]
│
│ 📌 *Contoh:*
│ • .play Alan Walker Faded
│ • .play Indonesia Raya
│ • .play Perfect Ed Sheeran
│
│ 🎵 *Fitur:*
│ • Mencari lagu di YouTube
│ • Download audio MP3
│ • Kualitas terbaik
│
╰─────────────────────────╯
      `.trim()
    }, { quoted: q('fkontak') })
  }

  try {
    await conn.sendMessage(m.chat, {
      text: `🔍 Sedang mencari: *${text}*...`
    }, { quoted: q('fkontak') })

    // Cari di YouTube
    const searchResult = await yts(text)
    
    if (!searchResult.videos.length) {
      return conn.sendMessage(m.chat, {
        text: "❌ Lagu tidak ditemukan! Coba kata kunci lain."
      }, { quoted: q('fkontak') })
    }

    const video = searchResult.videos[0]
    const { title, url, timestamp, views, author, image } = video

    // Kirim info video dengan button
    const infoText = `
╭───〔 *VIDEO DITEMUKAN* 〕───╮
│
│ 🎵 *${title}*
│
│ 👤 Channel: ${author.name}
│ ⏱️ Durasi: ${timestamp}
│ 👁️ Views: ${views.toLocaleString()}
│
╰──────────────────────────╯
    `.trim()

    await conn.sendMessage(m.chat, {
      image: { url: image },
      caption: infoText,
      footer: "YouTube Downloader",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "🎵 Download Audio",
            id: `.ytmp3 ${url}`
          })
        },
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "🎬 Download Video",
            id: `.ytmp4 ${url}`
          })
        },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "▶️ Tonton di YouTube",
            url: url,
            merchant_url: url
          })
        }
      ]
    }, { quoted: q('fkontak') })

    // Auto download audio
    await conn.sendMessage(m.chat, {
      text: "⏳ Mengunduh audio, mohon tunggu..."
    }, { quoted: q('fkontak') })

    // Gunakan API untuk download
    const apiUrl = `https://api.yt-download.org/api/v1/convert?url=${encodeURIComponent(url)}&format=mp3`
    
    try {
      const response = await axios.get(apiUrl, { timeout: 60000 })
      
      if (response.data && response.data.downloadUrl) {
        // Download file audio
        const audioResponse = await axios.get(response.data.downloadUrl, {
          responseType: 'arraybuffer',
          timeout: 120000
        })

        await conn.sendMessage(m.chat, {
          audio: Buffer.from(audioResponse.data),
          mimetype: 'audio/mpeg',
          fileName: `${title}.mp3`,
          contextInfo: {
            externalAdReply: {
              title: title,
              body: `🎵 ${author.name} | ⏱️ ${timestamp}`,
              thumbnailUrl: image,
              mediaType: 2,
              renderLargerThumbnail: true
            }
          }
        }, { quoted: m })
      } else {
        throw new Error('Download URL not found')
      }
    } catch (downloadErr) {
      console.error("Download Error:", downloadErr)
      
      // Fallback: kirim link alternatif
      await conn.sendMessage(m.chat, {
        text: `⚠️ Gagal mengunduh otomatis.\n\nSilakan download manual:\n${url}`,
        footer: "Download Manual"
      }, { quoted: q('fkontak') })
    }

  } catch (err) {
    console.error("PlayYT Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Terjadi kesalahan! Coba lagi nanti."
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['play', 'playyt', 'musik']
handler.tags = ['downloadmenu']
handler.command = ["play", "playyt", "musik", "lagu"]
handler.limit = true

module.exports = handler
