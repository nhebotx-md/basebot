/**
 * Plugin: aichat.js
 * Description: Chat dengan AI GPT
 * Command: .ai, .aichat
 */

const axios = require('axios')

// Store conversation history
const conversations = new Map()

const handler = async (m, Obj) => {
  const { conn, q, button, text, sender } = Obj

  if (!text) {
    const helpText = `
╭━━━❰ *AI CHAT* ❱━━━╮
┃
┃ 🤖 Chat dengan AI Assistant
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ .ai Pertanyaan
┃ .aichat Halo AI
┃
┃ *Contoh:*
┃ .ai Apa itu JavaScript?
┃ .ai Ceritakan dongeng
┃ .ai Bantu saya coding
┃
┃ 💡 *Fitur:*
┃ • Natural conversation
┃ • Coding assistant
┃ • General knowledge
┃ • Creative writing
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.quickReply("💡 Apa itu AI?", ".ai Apa itu Artificial Intelligence?"),
      ...button.flow.quickReply("🎨 AI Image", ".aimage cat in space"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    return button.sendInteractive(helpText, buttons, {
      title: "AI Chat",
      body: "Chat dengan AI Assistant"
    })
  }

  try {
    await conn.sendMessage(m.chat, {
      text: "🤖 AI sedang berpikir..."
    }, { quoted: q('fkontak') })

    // Get or create conversation history
    const userId = sender
    if (!conversations.has(userId)) {
      conversations.set(userId, [])
    }
    const history = conversations.get(userId)

    // Add user message to history
    history.push({ role: 'user', content: text })

    // Keep only last 10 messages
    if (history.length > 10) {
      history.shift()
    }

    // Try different AI APIs
    let aiResponse = null

    // API 1: Blackbox AI
    try {
      const apiUrl = `https://api.deline.web.id/ai/blackbox?prompt=${encodeURIComponent(text)}`
      const response = await axios.get(apiUrl, { timeout: 15000 })
      if (response.data && response.data.result) {
        aiResponse = response.data.result
      }
    } catch (e) {
      console.log('Blackbox API failed:', e.message)
    }

    // API 2: Fallback to other AI
    if (!aiResponse) {
      try {
        const apiUrl = `https://api.vreden.web.id/api/openai?text=${encodeURIComponent(text)}`
        const response = await axios.get(apiUrl, { timeout: 15000 })
        if (response.data && response.data.result) {
          aiResponse = response.data.result
        }
      } catch (e) {
        console.log('OpenAI API failed:', e.message)
      }
    }

    // API 3: Another fallback
    if (!aiResponse) {
      try {
        const apiUrl = `https://api.lolhuman.xyz/api/openai?apikey=&text=${encodeURIComponent(text)}`
        const response = await axios.get(apiUrl, { timeout: 15000 })
        if (response.data && response.data.result) {
          aiResponse = response.data.result
        }
      } catch (e) {
        console.log('Lolhuman API failed:', e.message)
      }
    }

    if (!aiResponse) {
      throw new Error('Semua AI API tidak merespons')
    }

    // Add AI response to history
    history.push({ role: 'assistant', content: aiResponse })

    // Format response
    const responseText = `
╭━━━❰ *AI RESPONSE* ❱━━━╮
┃
┃ 🤖 *Pertanyaan:*
┃ ${text.length > 50 ? text.substring(0, 50) + '...' : text}
┃
┃ 💬 *Jawaban:*
┃ ${aiResponse}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.quickReply("🎨 AI Image", ".aimage"),
      ...button.flow.quickReply("💬 Lanjut Chat", ".ai "),
      ...button.flow.quickReply("🗑️ Clear History", ".aiclear"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    await button.sendInteractive(responseText, buttons, {
      title: "AI Response",
      body: "Powered by AI"
    })

  } catch (err) {
    console.error("AI Chat Error:", err)
    
    const buttons = [
      ...button.flow.quickReply("🔄 Coba Lagi", `.ai ${text}`),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    await button.sendInteractive(
      `❌ AI tidak dapat merespons.\n\nError: ${err.message}\n\nSilakan coba lagi nanti.`,
      buttons,
      { title: "AI Error", body: "Please try again" }
    )
  }
}

// Clear conversation command
handler.clear = async (m, Obj) => {
  const { sender } = Obj
  conversations.delete(sender)
  return Obj.conn.sendMessage(m.chat, {
    text: "✅ Riwayat percakapan AI telah dihapus!"
  }, { quoted: Obj.q('fkontak') })
}

handler.help = ['ai']
handler.tags = ['ai']
handler.command = ['ai', 'aichat', 'openai', 'gpt']
handler.limit = true

module.exports = handler
