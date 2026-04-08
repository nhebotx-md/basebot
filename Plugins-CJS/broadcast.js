/**
 * Broadcast Plugin
 * Category: ownermenu
 * Feature: Mengirim pesan ke semua chat
 */

const fs = require('fs')
const path = require('path')

const handler = async (m, Obj) => {
  const { conn, q, args, text, isOwner, reply } = Obj

  if (!isOwner) {
    return conn.sendMessage(m.chat, {
      text: "❌ Fitur ini hanya untuk owner bot!",
      footer: "Owner Only"
    }, { quoted: q('fkontak') })
  }

  if (!text) {
    return conn.sendMessage(m.chat, {
      text: "❌ Masukkan pesan yang ingin di-broadcast!",
      footer: "Broadcast System",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Contoh",
            id: ".bc example"
          })
        }
      ]
    }, { quoted: q('fkontak') })
  }

  if (text.toLowerCase() === 'example') {
    return conn.sendMessage(m.chat, {
      text: `
╭───〔 *BROADCAST SYSTEM* 〕───╮
│
│ 📢 Kirim pesan ke semua chat
│
│ 📋 *Cara Penggunaan:*
│
│ .bc [pesan]
│ .bcgroup [pesan] → Khusus grup
│ .bcprivate [pesan] → Khusus private
│
│ 📌 *Contoh:*
│ • .bc Halo semuanya!
│ • .bc 📢 *Pengumuman*\nBot akan maintenance
│
│ ⚠️ *Catatan:*
│ • Hanya owner yang bisa
│ • Gunakan dengan bijak
│ • Bisa menyebabkan delay
│
╰──────────────────────────╯
      `.trim()
    }, { quoted: q('fkontak') })
  }

  try {
    // Ambil semua chat dari store
    const chats = Object.values(conn.chats || {})
    const groups = chats.filter(chat => chat.id.endsWith('@g.us'))
    const privates = chats.filter(chat => chat.id.endsWith('@s.whatsapp.net'))

    // Tentukan target berdasarkan command
    const command = m.text.split(' ')[0].toLowerCase()
    let targets = []
    let type = ''

    if (command === '.bcgroup' || command === '.bcgc') {
      targets = groups
      type = 'GRUP'
    } else if (command === '.bcprivate' || command === '.bcpv') {
      targets = privates
      type = 'PRIVATE'
    } else {
      targets = chats.filter(chat => chat.id && (chat.id.endsWith('@g.us') || chat.id.endsWith('@s.whatsapp.net')))
      type = 'SEMUA'
    }

    await conn.sendMessage(m.chat, {
      text: `📢 *Memulai Broadcast*\n\n📊 Target: ${targets.length} chat (${type})\n⏳ Mohon tunggu...`
    }, { quoted: q('fkontak') })

    let success = 0
    let failed = 0
    const failedChats = []

    // Kirim pesan ke setiap target
    for (const chat of targets) {
      try {
        await conn.sendMessage(chat.id, {
          text: `
╭───〔 *BROADCAST* 〕───╮
│
${text}
│
╰─────────────────────╯
          `.trim(),
          contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            externalAdReply: {
              title: "📢 Broadcast Message",
              body: "From NHE Bot",
              thumbnailUrl: "https://files.catbox.moe/5x2b8n.jpg",
              renderLargerThumbnail: true
            }
          }
        })
        
        success++
        
        // Delay untuk menghindari rate limit
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (err) {
        failed++
        failedChats.push(chat.id)
        console.error(`Broadcast failed for ${chat.id}:`, err.message)
      }
    }

    // Kirim laporan
    const reportText = `
╭───〔 *BROADCAST SELESAI* 〕───╮
│
│ 📊 *Statistik:*
│ • Total Target: ${targets.length}
│ • ✅ Berhasil: ${success}
│ • ❌ Gagal: ${failed}
│ • 📋 Tipe: ${type}
│
│ 📝 *Pesan:*
│ ${text.length > 100 ? text.substring(0, 100) + '...' : text}
│
╰──────────────────────────╯
    `.trim()

    await conn.sendMessage(m.chat, {
      text: reportText,
      footer: "Broadcast Report",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "📢 Broadcast Lagi",
            id: ".bc "
          })
        }
      ]
    }, { quoted: q('fkontak') })

    // Log failed chats
    if (failedChats.length > 0) {
      console.log('Failed broadcast to:', failedChats)
    }

  } catch (err) {
    console.error("Broadcast Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Terjadi kesalahan saat broadcast!",
      footer: "Broadcast Error"
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['broadcast', 'bc', 'bcgroup', 'bcprivate']
handler.tags = ['ownermenu']
handler.command = ["broadcast", "bc", "bcgroup", "bcgc", "bcprivate", "bcpv"]
handler.owner = true

module.exports = handler
