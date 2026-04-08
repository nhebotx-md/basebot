/**
 * Sticker Trigger Effect Plugin
 * Category: stickermenu
 * Feature: Membuat sticker dengan efek triggered (getar/getar)
 */

const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const util = require('util')
const execPromise = util.promisify(exec)
const axios = require('axios')

const handler = async (m, Obj) => {
  const { conn, q, quoted } = Obj

  if (!quoted) {
    return conn.sendMessage(m.chat, {
      text: "❌ Reply gambar yang mau diberi efek triggered!",
      footer: "Triggered Effect",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Cara Pakai",
            id: ".trigger help"
          })
        }
      ]
    }, { quoted: q('fkontak') })
  }

  const mimetype = quoted.mimetype || ''
  
  if (!/image/.test(mimetype)) {
    return conn.sendMessage(m.chat, {
      text: "❌ Hanya gambar yang bisa diberi efek triggered!"
    }, { quoted: q('fkontak') })
  }

  try {
    await conn.sendMessage(m.chat, {
      text: "⏳ Sedang membuat triggered sticker..."
    }, { quoted: q('fkontak') })

    // Download media
    const buffer = await quoted.download()
    const tempDir = path.join(__dirname, '../temp')
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    const inputPath = path.join(tempDir, `trigger_input_${Date.now()}.png`)
    const outputPath = path.join(tempDir, `trigger_output_${Date.now()}.webp`)

    // Simpan buffer sementara
    fs.writeFileSync(inputPath, buffer)

    // Download triggered overlay
    const triggeredUrl = 'https://raw.githubusercontent.com/samu330/triggered/master/triggered.png'
    const overlayPath = path.join(tempDir, 'triggered_overlay.png')
    
    try {
      const overlayResponse = await axios.get(triggeredUrl, { responseType: 'arraybuffer' })
      fs.writeFileSync(overlayPath, Buffer.from(overlayResponse.data))
    } catch {
      // Buat overlay sederhana jika download gagal
      await execPromise(`convert -size 512x100 xc:red -pointsize 40 -fill white -gravity center -annotate +0+0 "TRIGGERED" "${overlayPath}"`)
    }

    // Proses gambar dengan efek triggered
    // 1. Resize gambar utama
    // 2. Tambahkan overlay triggered
    // 3. Tambahkan efek getar (shake) dengan multiple frames
    const frames = []
    const frameCount = 8

    for (let i = 0; i < frameCount; i++) {
      const framePath = path.join(tempDir, `frame_${i}_${Date.now()}.png`)
      const offsetX = Math.floor(Math.random() * 20) - 10
      const offsetY = Math.floor(Math.random() * 20) - 10
      
      await execPromise(`convert "${inputPath}" \
        -resize 512x512^ -gravity center -extent 512x512 \
        -modulate 100,150 \
        -fill red -colorize 20% \
        -geometry +${offsetX}+${offsetY} \
        "${overlayPath}" -gravity South -composite \
        "${framePath}"`)
      
      frames.push(framePath)
    }

    // Gabungkan frames jadi animated webp
    const frameList = frames.map(f => `"${f}"`).join(' ')
    await execPromise(`convert -delay 5 -loop 0 ${frameList} -resize 512x512 "${outputPath}"`)

    // Kirim sticker
    const stickerBuffer = fs.readFileSync(outputPath)
    await conn.sendMessage(m.chat, {
      sticker: stickerBuffer
    }, { quoted: m })

    // Bersihkan file temp
    try {
      fs.unlinkSync(inputPath)
      fs.unlinkSync(outputPath)
      fs.unlinkSync(overlayPath)
      frames.forEach(f => {
        try { fs.unlinkSync(f) } catch {}
      })
    } catch {}

  } catch (err) {
    console.error("Trigger Error:", err)
    
    // Fallback: gunakan API eksternal
    try {
      const buffer = await quoted.download()
      const base64 = buffer.toString('base64')
      
      // Gunakan API trigger
      const apiUrl = `https://api.popcat.xyz/triggered?image=${encodeURIComponent('data:image/png;base64,' + base64)}`
      
      const response = await axios.get(apiUrl, { responseType: 'arraybuffer' })
      
      await conn.sendMessage(m.chat, {
        sticker: Buffer.from(response.data)
      }, { quoted: m })
    } catch (apiErr) {
      conn.sendMessage(m.chat, {
        text: "❌ Gagal membuat triggered sticker!\n\nPastikan ImageMagick terinstall atau coba lagi nanti."
      }, { quoted: q('fkontak') })
    }
  }
}

handler.help = ['trigger', 'triggered', 'stickertrigger']
handler.tags = ['stickermenu']
handler.command = ["trigger", "triggered", "stickertrigger"]

module.exports = handler
