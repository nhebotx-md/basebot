import fetch from "node-fetch"

async function searchSoundcloud(query) {
  let res = await fetch(`https://x.0cd.fun/search/soundcloud?query=${encodeURIComponent(query)}`)
  return res.json()
}

async function downloadSoundcloud(url) {
  let res = await fetch(`http://52.230.94.86:1464/download/aio?url=${encodeURIComponent(url)}`)
  return res.json()
}

async function handler(m, { text, usedPrefix, command, conn }) {
  if (!text) return m.reply(`Contoh:\n${usedPrefix}${command} dance with the devil`)

  try {
    m.reply("🔎 Searching Spotify/SoundCloud...")

   
    let search = await searchSoundcloud(text)
    if (!search.status || !search.data?.data?.length) return m.reply("❌ Lagu tidak ditemukan")

    let song = search.data.data.find(v => v.permalink_url) || search.data.data[0]

 
    m.reply("⏳ Downloading audio...")
    let dl = await downloadSoundcloud(song.permalink_url)
    if (!dl.status) return m.reply("❌ Gagal download audio")

    let media = dl.result.medias.find(v => v.type === "audio")
    if (!media) return m.reply("❌ Audio tidak tersedia")

    let caption = `🎧 *Spotify Play*

🎵 Judul: ${dl.result.title}
👤 Author: ${dl.result.author || "Unknown"}
⏱ Durasi: ${dl.result.duration}
🔗 Source: SoundCloud
    `

    await conn.sendMessage(m.chat, {
      audio: { url: media.url },
      mimetype: "audio/mpeg",
      fileName: `${dl.result.title}.mp3`,
      caption,
      contextInfo: {
        externalAdReply: {
          title: dl.result.title,
          body: "Spotify Play Downloader",
          thumbnailUrl: dl.result.thumbnail,
          mediaType: 1,
          mediaUrl: dl.result.url,
          sourceUrl: dl.result.url,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: m })

  } catch (e) {
    console.error(e)
    m.reply("❌ Error SpotifyPlay")
  }
}

handler.help = ["spotifyplay"]
handler.tags = ["downloader"]
handler.command = /^spotifyplay$/i

export default handler