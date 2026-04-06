/**
 * Plugin: YTMP3
 * Type: ESM
 * Command: .ytmp3 <url>
 */

import SaveTube from '../Library/savetube.js'

const ytdl = new SaveTube()

async function downloadMp3(url) {
  const res = await ytdl.download(url, 'mp3')
  if (!res.status) {
    throw new Error(res.msg || res.error || 'Gagal download')
  }
  return res
}

async function handler(m, { text, usedPrefix, command, sock }) {
  if (!text) {
    return m.reply(
      `❌ Masukkan URL YouTube\n\nContoh:\n${usedPrefix + command} https://youtu.be/xxxx`
    )
  }

  try {
    await m.reply('⏳ Mengunduh audio, mohon tunggu...')

    const data = await downloadMp3(text)

    await sock.sendMessage(
      m.chat,
      {
        audio: { url: data.dl },
        mimetype: 'audio/mpeg',
        fileName: `${data.title}.mp3`,
        contextInfo: {
          externalAdReply: {
            title: data.title,
            body: `Durasi: ${data.duration}`,
            thumbnailUrl: data.thumb,
            mediaType: 1,
            renderLargerThumbnail: true
          }
        }
      },
      { quoted: m }
    )

  } catch (err) {
    console.error(err)
    await m.reply(`❌ Error: ${err.message}`)
  }
}

handler.help = ['ytmp3 <url>']
handler.tags = ['downloader']
handler.command = /^(ytmp3)$/i

export default handler