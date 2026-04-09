/**
 * Plugin: grouppoll.js
 * Description: Buat polling/voting di grup
 * Command: .poll, .voting
 */

const handler = async (m, Obj) => {
  const { conn, q, button, isGroup, isAdmins, text, args } = Obj

  if (!isGroup) {
    return conn.sendMessage(m.chat, {
      text: "❌ Fitur ini hanya bisa digunakan di grup!"
    }, { quoted: q('fkontak') })
  }

  // Parse poll format: .poll Pertanyaan | Opsi1 | Opsi2 | Opsi3
  if (!text) {
    const helpText = `
╭━━━❰ *POLL/VOTING* ❱━━━╮
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ .poll Pertanyaan | Opsi1 | Opsi2
┃
┃ *Contoh:*
┃ .poll Makanan favorit? | Nasi | Mie | Ayam
┃
┃ 📊 *Fitur:*
┃ • Buat polling interaktif
┃ • Maksimal 5 opsi
┃ • Real-time voting
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.quickReply("📋 Contoh Poll", ".poll Apa warna favoritmu? | Merah | Biru | Hijau"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    return button.sendInteractive(helpText, buttons, {
      title: "Poll/Voting",
      body: "Buat polling di grup"
    })
  }

  const parts = text.split('|').map(p => p.trim())
  
  if (parts.length < 2) {
    return conn.sendMessage(m.chat, {
      text: "❌ Format salah! Gunakan: .poll Pertanyaan | Opsi1 | Opsi2"
    }, { quoted: q('fkontak') })
  }

  const question = parts[0]
  const options = parts.slice(1, 6) // Max 5 options

  if (options.length < 2) {
    return conn.sendMessage(m.chat, {
      text: "❌ Minimal 2 opsi diperlukan!"
    }, { quoted: q('fkontak') })
  }

  try {
    // Create poll using WhatsApp native poll feature
    const pollMessage = {
      pollCreationMessage: {
        name: question,
        options: options.map(opt => ({ optionName: opt })),
        selectableOptionsCount: 1
      }
    }

    await conn.sendMessage(m.chat, pollMessage)

    // Send follow-up with buttons for quick actions
    const followUpText = `
✅ *Polling dibuat!*

❓ *${question}*
${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}

📊 Silakan vote di atas!`

    const buttons = [
      ...button.flow.quickReply("🗑️ Hapus Poll", ".deletepoll"),
      ...button.flow.quickReply("📊 Hasil", ".pollresult"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    await button.sendInteractive(followUpText, buttons, {
      title: "Poll Created",
      body: question
    })

  } catch (err) {
    console.error("Poll Error:", err)
    
    // Fallback: kirim sebagai pesan biasa dengan button
    const fallbackText = `
📊 *POLLING*

❓ *${question}*

${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}

💬 Reply dengan angka untuk vote!`

    const voteButtons = options.map((opt, i) => 
      button.flow.quickReply(`${i + 1}. ${opt}`, `.vote ${i + 1}`)
    ).flat()

    await button.sendInteractive(fallbackText, [
      ...voteButtons,
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ], {
      title: "Poll/Voting",
      body: question
    })
  }
}

handler.help = ['poll']
handler.tags = ['group']
handler.command = ['poll', 'voting', 'buatpoll']
handler.group = true

module.exports = handler
