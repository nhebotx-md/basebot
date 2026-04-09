/**
 * Plugin: broadcast.js
 * Description: Broadcast pesan ke semua chat
 * Command: .broadcast, .bc
 */

const handler = async (m, Obj) => {
  const { conn, q, button, text, isOwner, args } = Obj

  if (!isOwner) {
    return conn.sendMessage(m.chat, {
      text: "❌ Fitur ini hanya untuk Owner!"
    }, { quoted: q('fkontak') })
  }

  if (!text) {
    const helpText = `
╭━━━❰ *BROADCAST* ❱━━━╮
┃
┃ 📢 Kirim pesan ke semua chat
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ .broadcast Pesan
┃ .bc Pesan
┃
┃ *Opsi:*
┃ .bc gc Pesan (Grup only)
┃ .bc pc Pesan (Private only)
┃
┃ *Contoh:*
┃ .bc Halo semuanya!
┃ .bc gc Update group rules
┃
┃ ⚠️ *Peringatan:*
┃ • Gunakan dengan bijak
┃ • Jangan spam
┃ • Bisa membuat bot delay
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.quickReply("🗑️ Clear Chat", ".clearchat"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    return button.sendInteractive(helpText, buttons, {
      title: "Broadcast",
      body: "Kirim pesan massal"
    })
  }

  try {
    // Get all chats
    const chats = await conn.groupFetchAllParticipating().catch(() => ({}))
    const groups = Object.entries(chats).map(([jid, chat]) => ({ jid, ...chat }))
    
    // Also get private chats (this is simplified, actual implementation may vary)
    const allChats = Object.values(conn.chats || {})
    const privateChats = allChats.filter(chat => chat.id && !chat.id.endsWith('@g.us') && !chat.id.includes('broadcast'))

    let targetChats = []
    const type = args[0]?.toLowerCase()

    if (type === 'gc' || type === 'group') {
      targetChats = groups.map(g => g.jid)
      args.shift()
    } else if (type === 'pc' || type === 'private') {
      targetChats = privateChats.map(c => c.id)
      args.shift()
    } else {
      targetChats = [...groups.map(g => g.jid), ...privateChats.map(c => c.id)]
    }

    const message = args.join(' ') || text

    if (targetChats.length === 0) {
      return conn.sendMessage(m.chat, {
        text: "❌ Tidak ada chat yang bisa dikirimi!"
      }, { quoted: q('fkontak') })
    }

    await conn.sendMessage(m.chat, {
      text: `📢 *Broadcast dimulai!*\n\n📊 Target: ${targetChats.length} chat\n⏳ Sedang mengirim...`
    }, { quoted: q('fkontak') })

    let success = 0
    let failed = 0

    for (const chatId of targetChats) {
      try {
        await conn.sendMessage(chatId, {
          text: `
📢 *BROADCAST MESSAGE*

${message}

_— ${global.botname || 'Bot'}_`
        })
        success++
        await new Promise(r => setTimeout(r, 1000)) // Delay 1s
      } catch (e) {
        failed++
        console.log(`Failed to send to ${chatId}:`, e.message)
      }
    }

    // Result
    const resultText = `
╭━━━❰ *BROADCAST SELESAI* ❱━━━╮
┃
┃ ✅ *Berhasil:* ${success}
┃ ❌ *Gagal:* ${failed}
┃ 📊 *Total:* ${targetChats.length}
┃
┃ 📝 *Pesan:*
┃ ${message.length > 100 ? message.substring(0, 100) + '...' : message}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.quickReply("🗑️ Clear Chat", ".clearchat"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    await button.sendInteractive(resultText, buttons, {
      title: "Broadcast Complete",
      body: `${success} success, ${failed} failed`
    })

  } catch (err) {
    console.error("Broadcast Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Gagal broadcast: " + err.message
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['broadcast']
handler.tags = ['owner']
handler.command = ['broadcast', 'bc', 'broad']
handler.owner = true

module.exports = handler
