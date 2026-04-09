/**
 * Plugin: ytvideo.js
 * Description: Download YouTube video
 * Command: .ytvideo, .ytv
 */

const yts = require('yt-search')
const { getBuffer } = require('../Library/myfunction')

const handler = async (m, Obj) => {
  const { conn, q, button, text, args } = Obj

  if (!text) {
    const helpText = `
╭━━━❰ *YOUTUBE VIDEO* ❱━━━╮
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ .ytvideo Judul/URL
┃ .ytv Judul/URL
┃
┃ *Contoh:*
┃ .ytv Alan Walker Faded
┃ .ytv https://youtube.com/watch?v=...
┃
┃ 🎬 *Fitur:*
┃ • Cari video di YouTube
┃ • Download video MP4
┃ • Multiple qualities
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.quickReply("🎵 Play Music", ".play"),
      ...button.flow.quickReply("🎧 Spotify", ".spotify"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    return button.sendInteractive(helpText, buttons, {
      title: "YouTube Video",
      body: "Download video YouTube"
    })
  }

  try {
    let videoUrl = text
    let title, thumbnail, author, timestamp, views

    // Check if input is URL
    const isUrl = text.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)/)

    if (!isUrl) {
      await conn.sendMessage(m.chat, {
        text: `🔍 Mencari video: *${text}*...`
      }, { quoted: q('fkontak') })

      const search = await yts(text)
      const video = search.videos[0]

      if (!video) {
        return conn.sendMessage(m.chat, {
          text: "❌ Video tidak ditemukan!"
        }, { quoted: q('fkontak') })
      }

      videoUrl = video.url
      title = video.title
      thumbnail = video.thumbnail
      author = video.author.name
      timestamp = video.timestamp
      views = video.views
    } else {
      // Extract video ID from URL
      const videoId = text.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1]
      if (!videoId) {
        return conn.sendMessage(m.chat, {
          text: "❌ URL YouTube tidak valid!"
        }, { quoted: q('fkontak') })
      }

      const search = await yts({ videoId })
      title = search.title
      thumbnail = search.thumbnail
      author = search.author.name
      timestamp = search.timestamp
      views = search.views
    }

    // Info message
    const infoText = `
╭━━━❰ *VIDEO FOUND* ❱━━━╮
┃
┃ 🎬 *${title}*
┃
┃ 👤 Channel: ${author}
┃ ⏱️ Duration: ${timestamp}
┃ 👁️ Views: ${views?.toLocaleString() || 'N/A'}
┃
┃ ⏳ Sedang mendownload video...
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    await conn.sendMessage(m.chat, {
      image: { url: thumbnail },
      caption: infoText
    }, { quoted: m })

    // Download using API
    try {
      const apiUrl = `https://api.deline.web.id/download/ytmp4?url=${encodeURIComponent(videoUrl)}`
      const response = await fetch(apiUrl).then(res => res.json()).catch(() => null)

      if (response && response.result && response.result.downloadUrl) {
        const videoBuffer = await getBuffer(response.result.downloadUrl)

        await conn.sendMessage(m.chat, {
          video: videoBuffer,
          caption: `🎬 *${title}*\n👤 ${author}`,
          contextInfo: {
            externalAdReply: {
              title: title,
              body: author,
              thumbnailUrl: thumbnail,
              sourceUrl: videoUrl,
              mediaType: 1
            }
          }
        }, { quoted: m })

        // Success buttons
        const buttons = [
          ...button.flow.quickReply("🎵 Audio Version", `.play ${title}`),
          ...button.flow.quickReply("📋 Menu", ".menuplug")
        ]

        await button.sendInteractive(`✅ *${title}* berhasil dikirim!`, buttons, {
          title: "Download Complete",
          body: title
        })
      } else {
        throw new Error('API response invalid')
      }
    } catch (apiErr) {
      // Fallback: send link
      const buttons = [
        ...button.flow.ctaUrl("🔗 Buka YouTube", videoUrl),
        ...button.flow.quickReply("🎵 Audio", `.play ${title || text}`),
        ...button.flow.quickReply("📋 Menu", ".menuplug")
      ]

      await button.sendInteractive(
        `⚠️ Download gagal, tapi video ditemukan!\n\n🎬 *${title || text}*\n🔗 ${videoUrl}`,
        buttons,
        { title: "Video Found", body: "Click to open YouTube" }
      )
    }

  } catch (err) {
    console.error("YTVideo Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Gagal mendownload video: " + err.message
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['ytvideo']
handler.tags = ['download']
handler.command = ['ytvideo', 'ytv', 'ytmp4']
handler.limit = true

module.exports = handler
