/**
 * YouTube Video Download Plugin
 * Category: downloadmenu
 * Feature: Download video dari YouTube dengan pilihan kualitas
 */

const yts = require('yt-search')
const axios = require('axios')

const handler = async (m, Obj) => {
  const { conn, q, args, text, quoted } = Obj

  // Dapatkan URL dari args atau quoted
  let url = args[0] || ''
  
  if (!url && quoted && quoted.text) {
    // Cek apakah ada URL di quoted message
    const urlMatch = quoted.text.match(/(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/\S+/)
    if (urlMatch) url = urlMatch[0]
  }

  if (!url) {
    return conn.sendMessage(m.chat, {
      text: "❌ Masukkan URL YouTube!",
      footer: "YouTube Video Downloader",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Cara Pakai",
            id: ".ytvideo help"
          })
        }
      ]
    }, { quoted: q('fkontak') })
  }

  if (url.toLowerCase() === 'help') {
    return conn.sendMessage(m.chat, {
      text: `
╭───〔 *YOUTUBE VIDEO* 〕───╮
│
│ 📋 *Cara Penggunaan:*
│
│ .ytvideo [URL YouTube]
│
│ 📌 *Contoh:*
│ • .ytvideo https://youtube.com/watch?v=xxxxx
│ • .ytvideo https://youtu.be/xxxxx
│
│ 🎬 *Fitur:*
│ • Download video MP4
│ • Pilihan kualitas
│ • Cepat dan mudah
│
╰─────────────────────────╯
      `.trim()
    }, { quoted: q('fkontak') })
  }

  // Validasi URL YouTube
  const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/
  if (!ytRegex.test(url)) {
    return conn.sendMessage(m.chat, {
      text: "❌ URL YouTube tidak valid!"
    }, { quoted: q('fkontak') })
  }

  try {
    await conn.sendMessage(m.chat, {
      text: "⏳ Sedang memproses video..."
    }, { quoted: q('fkontak') })

    // Dapatkan info video
    let videoInfo
    try {
      const videoId = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1]
      if (videoId) {
        const searchResult = await yts({ videoId })
        videoInfo = searchResult
      } else {
        throw new Error('Video ID not found')
      }
    } catch {
      // Fallback: extract dari URL langsung
      videoInfo = { title: 'YouTube Video', timestamp: 'Unknown' }
    }

    // Kirim pilihan kualitas dengan button
    await conn.sendMessage(m.chat, {
      text: `
╭───〔 *PILIH KUALITAS* 〕───╮
│
│ 🎬 *${videoInfo.title || 'YouTube Video'}*
│ ⏱️ Durasi: ${videoInfo.timestamp || 'Unknown'}
│
│ 📊 *Pilihan Kualitas:*
│
│ • 360p - Cepat, hemat data
│ • 480p - Kualitas standar
│ • 720p - HD (rekomendasi)
│ • 1080p - Full HD
│
╰─────────────────────────╯
      `.trim(),
      footer: "Pilih Kualitas Video",
      interactiveButtons: [
        {
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "📊 Pilih Kualitas",
            sections: [{
              title: "Kualitas Video",
              rows: [
                { title: "📱 360p", description: "Cepat, hemat data", id: `.ytmp4 ${url} 360` },
                { title: "📱 480p", description: "Kualitas standar", id: `.ytmp4 ${url} 480` },
                { title: "💻 720p", description: "HD - Rekomendasi", id: `.ytmp4 ${url} 720` },
                { title: "🖥️ 1080p", description: "Full HD", id: `.ytmp4 ${url} 1080` }
              ]
            }]
          })
        }
      ]
    }, { quoted: q('fkontak') })

  } catch (err) {
    console.error("YTVideo Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Terjadi kesalahan! Coba lagi nanti."
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['ytvideo', 'ytv', 'youtubevideo']
handler.tags = ['downloadmenu']
handler.command = ["ytvideo", "ytv", "youtubevideo"]
handler.limit = true

module.exports = handler
