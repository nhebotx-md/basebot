/**
 * Clear Chat Plugin
 * Category: ownermenu
 * Feature: Menghapus semua chat
 */

const handler = async (m, Obj) => {
  const { conn, q, args, isOwner, reply } = Obj

  if (!isOwner) {
    return conn.sendMessage(m.chat, {
      text: "❌ Fitur ini hanya untuk owner bot!",
      footer: "Owner Only"
    }, { quoted: q('fkontak') })
  }

  const action = args[0]?.toLowerCase()

  if (action === 'confirm') {
    try {
      await conn.sendMessage(m.chat, {
        text: "🗑️ *Sedang menghapus semua chat...*"
      }, { quoted: q('fkontak') })

      // Ambil semua chat
      const chats = Object.values(conn.chats || {})
      let deleted = 0
      let failed = 0

      for (const chat of chats) {
        try {
          if (chat.id && (chat.id.endsWith('@g.us') || chat.id.endsWith('@s.whatsapp.net'))) {
            // Hapus chat
            await conn.chatModify({
              delete: true,
              lastMessages: [{ key: m.key, messageTimestamp: m.messageTimestamp }]
            }, chat.id)
            deleted++
            
            // Delay kecil
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        } catch (err) {
          failed++
          console.error(`Failed to delete chat ${chat.id}:`, err.message)
        }
      }

      await conn.sendMessage(m.chat, {
        text: `
╭───〔 *CLEAR CHAT SELESAI* 〕───╮
│
│ ✅ *Chat berhasil dihapus!*
│
│ 📊 *Statistik:*
│ • Total Dihapus: ${deleted}
│ • ❌ Gagal: ${failed}
│
╰────────────────────────────╯
        `.trim(),
        footer: "Clear Chat"
      }, { quoted: q('fkontak') })

    } catch (err) {
      console.error("Clear Chat Error:", err)
      conn.sendMessage(m.chat, {
        text: "❌ Terjadi kesalahan saat menghapus chat!",
        footer: "Clear Chat Error"
      }, { quoted: q('fkontak') })
    }

  } else if (action === 'this') {
    // Hapus chat ini saja
    try {
      await conn.chatModify({
        delete: true,
        lastMessages: [{ key: m.key, messageTimestamp: m.messageTimestamp }]
      }, m.chat)

      await conn.sendMessage(m.chat, {
        text: "✅ *Chat ini berhasil dihapus!*",
        footer: "Clear Chat"
      }, { quoted: q('fkontak') })

    } catch (err) {
      console.error("Clear This Chat Error:", err)
      conn.sendMessage(m.chat, {
        text: "❌ Gagal menghapus chat ini!",
        footer: "Clear Chat Error"
      }, { quoted: q('fkontak') })
    }

  } else if (action === 'status') {
    // Cek jumlah chat
    const chats = Object.values(conn.chats || {})
    const groups = chats.filter(c => c.id?.endsWith('@g.us'))
    const privates = chats.filter(c => c.id?.endsWith('@s.whatsapp.net'))

    await conn.sendMessage(m.chat, {
      text: `
╭───〔 *CHAT STATUS* 〕───╮
│
│ 📊 *Statistik Chat:*
│
│ • Total Chat: ${chats.length}
│ • 👥 Grup: ${groups.length}
│ • 👤 Private: ${privates.length}
│
│ 📋 *Perintah:*
│ • .clearchat this
│   → Hapus chat ini
│
│ • .clearchat confirm
│   → Hapus SEMUA chat
│   ⚠️ *Tidak bisa dibatalkan!*
│
╰────────────────────────╯
      `.trim(),
      footer: "Chat Status",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "🗑️ Hapus Chat Ini",
            id: ".clearchat this"
          })
        },
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "⚠️ Hapus Semua",
            id: ".clearchat confirm"
          })
        }
      ]
    }, { quoted: q('fkontak') })

  } else {
    // Menu utama
    await conn.sendMessage(m.chat, {
      text: `
╭───〔 *CLEAR CHAT MENU* 〕───╮
│
│ 🗑️ Hapus chat bot
│
│ 📋 *Perintah:*
│
│ • .clearchat status
│   → Cek status chat
│
│ • .clearchat this
│   → Hapus chat ini saja
│
│ • .clearchat confirm
│   → Hapus SEMUA chat
│   ⚠️ *Tidak bisa dibatalkan!*
│
│ ⚠️ *Peringatan:*
│ • Hanya owner yang bisa
│ • Chat yang dihapus tidak
│   bisa dikembalikan
│
╰────────────────────────╯
      `.trim(),
      footer: "Clear Chat System",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "📊 Status",
            id: ".clearchat status"
          })
        },
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "🗑️ Hapus Ini",
            id: ".clearchat this"
          })
        }
      ]
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['clearchat', 'clearchats', 'hapuschat']
handler.tags = ['ownermenu']
handler.command = ["clearchat", "clearchats", "hapuschat", "cc"]
handler.owner = true

module.exports = handler
