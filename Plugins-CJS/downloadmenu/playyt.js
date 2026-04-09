/**
 * Plugin: playyt.js
 * Description: Play & download YouTube audio
 * Command: .play, .playyt
 */

const yts = require('yt-search')
const { getBuffer } = require('../Library/myfunction')

const handler = async (m, Obj) => {
  const { conn, q, button, text, args } = Obj

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
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.quickReply("🎬 YouTube Video", ".ytvideo"),
      ...button.flow.quickReply("🎧 Spotify", ".spotify"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    return button.sendInteractive(helpText, buttons, {
      title: "Play YouTube",
      body: "Cari & download lagu"
    })
  }

  try {
    await conn.sendMessage(m.chat, {
      text: `🔍 Mencari: *${text}*...`
    }, { quoted: q('fkontak') })

    // Search YouTube
    const search = await yts(text)
    const video = search.videos[0]

    if (!video) {
      return conn.sendMessage(m.chat, {
        text: "❌ Lagu tidak ditemukan!"
      }, { quoted: q('fkontak') })
    }

    const { title, url, timestamp, views, author, thumbnail, ago } = video

    // Info message
    const infoText = `
╭━━━❰ *MUSIC FOUND* ❱━━━╮
┃
┃ 🎵 *${title}*
┃
┃ 👤 Channel: ${author.name}
┃ ⏱️ Duration: ${timestamp}
┃ 👁️ Views: ${views.toLocaleString()}
┃ 📅 Uploaded: ${ago}
┃
┃ ⏳ Sedang mendownload audio...
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    await conn.sendMessage(m.chat, {
      image: { url: thumbnail },
      caption: infoText
    }, { quoted: m })

    // Download using API
    try {
      const apiUrl = `https://api.deline.web.id/download/ytmp3?url=${encodeURIComponent(url)}`
      const response = await fetch(apiUrl).then(res => res.json()).catch(() => null)

      if (response && response.result && response.result.downloadUrl) {
        const audioBuffer = await getBuffer(response.result.downloadUrl)

        await conn.sendMessage(m.chat, {
          audio: audioBuffer,
          mimetype: 'audio/mp4',
          ptt: false,
          contextInfo: {
            externalAdReply: {
              title: title,
              body: author.name,
              thumbnailUrl: thumbnail,
              sourceUrl: url,
              mediaType: 1
            }
          }
        }, { quoted: m })

        // Success buttons
        const buttons = [
          ...button.flow.quickReply("🎬 Video Version", `.ytvideo ${text}`),
          ...button.flow.quickReply("🎧 Spotify", ".spotify"),
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
        ...button.flow.ctaUrl("🔗 Buka YouTube", url),
        ...button.flow.quickReply("🎬 Video", `.ytvideo ${text}`),
        ...button.flow.quickReply("📋 Menu", ".menuplug")
      ]

      await button.sendInteractive(
        `⚠️ Download gagal, tapi lagu ditemukan!\n\n🎵 *${title}*\n🔗 ${url}`,
        buttons,
        { title: "Music Found", body: "Click to open YouTube" }
      )
    }

  } catch (err) {
    console.error("Play Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Gagal mencari/mendownload: " + err.message
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['play']
handler.tags = ['download']
handler.command = ['play', 'playyt', 'playmusic']
handler.limit = true

module.exports = handler
