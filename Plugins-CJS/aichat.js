/**
 * AI Chat Plugin
 * Category: aimenu
 * Feature: Chat dengan AI (GPT/LLM)
 */

const axios = require('axios')
const fs = require('fs')
const path = require('path')

// Session storage untuk chat history
const SESSION_PATH = path.join(__dirname, '../data/ai_sessions.json')

const loadSessions = () => {
  if (!fs.existsSync(SESSION_PATH)) {
    fs.mkdirSync(path.dirname(SESSION_PATH), { recursive: true })
    return {}
  }
  try {
    return JSON.parse(fs.readFileSync(SESSION_PATH, 'utf8'))
  } catch {
    return {}
  }
}

const saveSessions = (data) => {
  fs.writeFileSync(SESSION_PATH, JSON.stringify(data, null, 2))
}

const handler = async (m, Obj) => {
  const { conn, q, args, text, command } = Obj

  if (!text) {
    return conn.sendMessage(m.chat, {
      text: "❌ Masukkan pesan untuk AI!",
      footer: "AI Chat Assistant",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Contoh",
            id: ".ai example"
          })
        },
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "🆕 Chat Baru",
            id: ".ai new"
          })
        }
      ]
    }, { quoted: q('fkontak') })
  }

  if (text.toLowerCase() === 'example') {
    return conn.sendMessage(m.chat, {
      text: `
╭───〔 *AI CHAT* 〕───╮
│
│ 🤖 Chat dengan AI Assistant
│
│ 📋 *Cara Penggunaan:*
│
│ .ai [pesan]
│
│ 📌 *Contoh:*
│ • .ai Halo, apa kabar?
│ • .ai Jelaskan tentang AI
│ • .ai Bantu saya menulis email
│ • .ai Ceritakan lelucon
│
│ 🔄 *Perintah Khusus:*
│ • .ai new → Chat baru
│ • .ai clear → Hapus history
│
│ ⚡ *Fitur:*
│ • Jawaban cerdas
│ • Mengingat konteks
│ • Multi-bahasa
│
╰────────────────────╯
      `.trim()
    }, { quoted: q('fkontak') })
  }

  // Handle perintah khusus
  if (text.toLowerCase() === 'new' || text.toLowerCase() === 'clear') {
    const sessions = loadSessions()
    delete sessions[m.sender]
    saveSessions(sessions)
    
    return conn.sendMessage(m.chat, {
      text: "✅ *Chat history berhasil dihapus!*\n\nMulai chat baru dengan .ai [pesan]",
      footer: "AI Chat"
    }, { quoted: q('fkontak') })
  }

  try {
    await conn.sendMessage(m.chat, {
      text: "🤖 AI sedang mengetik..."
    }, { quoted: q('fkontak') })

    // Load session
    const sessions = loadSessions()
    if (!sessions[m.sender]) {
      sessions[m.sender] = { history: [], createdAt: Date.now() }
    }

    // API endpoints untuk AI
    const aiApis = [
      {
        name: 'Blackbox',
        url: 'https://api.blackbox.ai/api/chat',
        method: 'POST',
        data: {
          messages: [
            { role: 'system', content: 'You are a helpful assistant named NHE Bot. Answer in the same language as the user.' },
            ...sessions[m.sender].history.slice(-5),
            { role: 'user', content: text }
          ],
          model: 'gpt-4o'
        }
      },
      {
        name: 'Lobechat',
        url: `https://api.lobechat.com/v1/chat/completions`,
        method: 'POST',
        headers: {
          'Authorization': 'Bearer free',
          'Content-Type': 'application/json'
        },
        data: {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are NHE Bot, a helpful AI assistant. Answer concisely in the same language as the user.' },
            ...sessions[m.sender].history.slice(-5),
            { role: 'user', content: text }
          ]
        }
      }
    ]

    let aiResponse = null
    let usedApi = ''

    for (const api of aiApis) {
      try {
        const response = await axios({
          method: api.method,
          url: api.url,
          headers: api.headers || { 'Content-Type': 'application/json' },
          data: api.data,
          timeout: 60000
        })

        if (response.data) {
          // Parse berbagai format response
          if (response.data.choices && response.data.choices[0]) {
            aiResponse = response.data.choices[0].message?.content || response.data.choices[0].text
          } else if (response.data.response) {
            aiResponse = response.data.response
          } else if (response.data.message) {
            aiResponse = response.data.message
          } else if (typeof response.data === 'string') {
            aiResponse = response.data
          }

          if (aiResponse) {
            usedApi = api.name
            break
          }
        }
      } catch (apiErr) {
        console.error(`${api.name} Error:`, apiErr.message)
        continue
      }
    }

    if (!aiResponse) {
      // Fallback: gunakan API publik lain
      try {
        const fallbackUrl = `https://api.simsimi.net/v2/?text=${encodeURIComponent(text)}&lc=id`
        const fallbackResponse = await axios.get(fallbackUrl, { timeout: 30000 })
        aiResponse = fallbackResponse.data.success || 'Maaf, saya tidak mengerti.'
        usedApi = 'SimSimi'
      } catch {
        throw new Error('All AI APIs failed')
      }
    }

    // Simpan ke history
    sessions[m.sender].history.push(
      { role: 'user', content: text },
      { role: 'assistant', content: aiResponse }
    )
    
    // Batasi history
    if (sessions[m.sender].history.length > 20) {
      sessions[m.sender].history = sessions[m.sender].history.slice(-20)
    }
    
    saveSessions(sessions)

    // Kirim response
    await conn.sendMessage(m.chat, {
      text: `
╭───〔 *AI RESPONSE* 〕───╮
│
│ 🤖 *NHE AI Assistant*
│
│ 💬 *Pertanyaan:*
│ ${text.length > 50 ? text.substring(0, 50) + '...' : text}
│
│ 📝 *Jawaban:*
│ ${aiResponse}
│
│ ⚡ Powered by ${usedApi}
╰────────────────────────╯
      `.trim(),
      footer: "AI Chat",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "💬 Lanjutkan Chat",
            id: ".ai "
          })
        },
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "🆕 Chat Baru",
            id: ".ai new"
          })
        }
      ]
    }, { quoted: q('fkontak') })

  } catch (err) {
    console.error("AI Chat Error:", err)
    conn.sendMessage(m.chat, {
      text: "❌ Maaf, AI sedang sibuk. Coba lagi nanti ya!",
      footer: "AI Chat"
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['ai', 'aichat', 'chatgpt', 'gpt']
handler.tags = ['aimenu']
handler.command = ["ai", "aichat", "chatgpt", "gpt", "openai"]

module.exports = handler
