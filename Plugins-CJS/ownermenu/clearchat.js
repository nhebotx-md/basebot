/**
 * Plugin: clearchat.js
 * Description: Hapus semua chat
 * Command: .clearchat, .cc
 */

const handler = async (m, Obj) => {
  const { conn, q, button, isOwner, args } = Obj

  if (!isOwner) {
    return conn.sendMessage(m.chat, {
      text: "❌ Fitur ini hanya untuk Owner!"
    }, { quoted: q('fkontak') })
  }

  // Check for confirmation
  const confirmed = args[0] === 'confirm' || args[0] === 'yes'

  if (!confirmed) {
    const confirmText = `
╭━━━❰ *CLEAR CHAT* ❱━━━╮
┃
┃ ⚠️ *PERINGATAN!*
┃
┃ Anda akan menghapus SEMUA
┃ chat dari database bot.
┃
┃ 📊 *Ini akan:*
┃ • Hapus semua chat
┃ • Hapus riwayat pesan
┃ • Bersihkan cache
┃
┃ ❗ *Tindakan ini tidak bisa
┃ dibatalkan!*
┃
┃ Ketik .clearchat confirm
┃ untuk melanjutkan.
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.quickReply("✅ Konfirmasi", ".clearchat confirm"),
      ...button.flow.quickReply("❌ Batal", ".menuplug"),
      ...button.flow.quickReply("📢 Broadcast", ".broadcast")
    ]

    return button.sendInteractive(confirmText, buttons, {
      title: "Clear Chat Confirmation",
      body: "Please confirm to continue"
    })
  }

  try {
    await conn.sendMessage(m.chat, {
      text: "🗑️ Sedang membersihkan chat..."
    }, { quoted: q('fkontak') })

    let clearedCount = 0
    let errorCount = 0

    // Clear chats from store
    if (conn.chats) {
      const chatIds = Object.keys(conn.chats)
      
      for (const chatId of chatIds) {
        try {
          // Delete chat messages from store
          if (conn.chats[chatId]) {
            delete conn.chats[chatId]
            clearedCount++
          }
        } catch (e) {
          errorCount++
          console.log(`Failed to clear ${chatId}:`, e.message)
        }
      }
    }

    // Clear message store if exists
    if (conn.store && conn.store.chats) {
      const storeChats = Object.keys(conn.store.chats)
      for (const chatId of storeChats) {
        try {
          if (conn.store.chats[chatId]) {
            conn.store.chats[chatId].clear()
            clearedCount++
          }
        } catch (e) {
          errorCount++
        }
      }
    }

    // Result
    const resultText = `
╭━━━❰ *CLEAR CHAT SELESAI* ❱━━━╮
┃
┃ ✅ *Chat dihapus:* ${clearedCount}
┃ ❌ *Gagal:* ${errorCount}
┃
┃ 🗑️ Semua chat telah
┃ dibersihkan dari database.
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.quickReply("📢 Broadcast", ".broadcast"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    await button.sendInteractive(resultText, buttons, {
      title: "Clear Chat Complete",
      body: "All chats cleared"
    })

  } catch (err) {
    console.error("Clear Chat Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Gagal membersihkan chat: " + err.message
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['clearchat']
handler.tags = ['owner']
handler.command = ['clearchat', 'cc', 'clearchats']
handler.owner = true

module.exports = handler
