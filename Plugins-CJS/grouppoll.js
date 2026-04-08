/**
 * Group Poll Plugin
 * Category: groupmenu
 * Feature: Membuat voting/polling di grup
 */

const handler = async (m, Obj) => {
  const { conn, q, args, isGroup, isBotAdmins, isAdmins, text } = Obj

  if (!isGroup) {
    return conn.sendMessage(m.chat, {
      text: "❌ Fitur ini hanya bisa digunakan di grup!"
    }, { quoted: q('fkontak') })
  }

  const action = args[0]?.toLowerCase()

  if (action === 'create') {
    // Format: .poll create Pertanyaan? | Opsi1 | Opsi2 | Opsi3
    const pollData = text.replace(/^create\s+/i, '')
    const parts = pollData.split('|').map(p => p.trim())
    
    if (parts.length < 3) {
      return conn.sendMessage(m.chat, {
        text: "❌ Format salah!\n\nContoh: .poll create Mau main apa? | Mobile Legends | Free Fire | PUBG",
        footer: "Poll Creator",
        interactiveButtons: [
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "📋 Lihat Contoh",
              id: ".poll example"
            })
          }
        ]
      }, { quoted: q('fkontak') })
    }

    const question = parts[0]
    const options = parts.slice(1).filter(opt => opt.length > 0)
    
    if (options.length < 2 || options.length > 12) {
      return conn.sendMessage(m.chat, {
        text: "❌ Opsi harus antara 2-12 pilihan!"
      }, { quoted: q('fkontak') })
    }

    // Buat poll
    const pollMessage = {
      pollCreationMessage: {
        name: question,
        options: options.map(opt => ({ optionName: opt })),
        selectableOptionsCount: 1
      }
    }

    await conn.sendMessage(m.chat, pollMessage)

  } else if (action === 'example') {
    await conn.sendMessage(m.chat, {
      text: `
╭───〔 *POLL EXAMPLES* 〕───╮
│
│ 📋 *Cara Membuat Poll:*
│
│ .poll create [Pertanyaan]? | [Opsi1] | [Opsi2] | ...
│
│ 📌 *Contoh:*
│
│ .poll create Mau makan apa? | Nasi Goreng | Mie Ayam | Bakso
│
│ .poll create Game favorit? | ML | FF | PUBG | COD
│
│ .poll create Waktu meeting? | Pagi | Siang | Sore | Malam
│
│ ⚠️ *Minimal 2 opsi, maksimal 12 opsi*
│
╰──────────────────────────╯
      `.trim(),
      footer: "Poll Creator",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "🗳️ Buat Poll",
            id: ".poll create "
          })
        }
      ]
    }, { quoted: q('fkontak') })

  } else {
    await conn.sendMessage(m.chat, {
      text: `
╭───〔 *GROUP POLL MENU* 〕───╮
│
│ 📋 *Perintah:*
│
│ • .poll create [pertanyaan] | [opsi1] | [opsi2] ...
│   → Membuat polling baru
│
│ • .poll example
│   → Melihat contoh poll
│
│ 📌 *Contoh:*
│ .poll create Mau main apa? | ML | FF | PUBG
│
│ ⚠️ *Minimal 2 opsi, maksimal 12 opsi*
│
╰──────────────────────────╯
      `.trim(),
      footer: "Poll System",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Contoh",
            id: ".poll example"
          })
        },
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "🗳️ Buat Poll",
            id: ".poll create "
          })
        }
      ]
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['poll', 'voting', 'vote']
handler.tags = ['groupmenu']
handler.command = ["poll", "voting", "vote"]
handler.group = true

module.exports = handler
