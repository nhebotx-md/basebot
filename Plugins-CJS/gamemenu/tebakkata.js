/**
 * Plugin: tebakkata.js
 * Description: Game tebak kata
 * Command: .tebakkata, .tebak
 */

const fs = require('fs')
const path = require('path')

// Game data
const kataKata = [
  { kata: "JAVASCRIPT", hint: "Bahasa pemrograman web populer" },
  { kata: "WHATSAPP", hint: "Aplikasi chat terpopuler" },
  { kata: "INDONESIA", hint: "Negara dengan ribuan pulau" },
  { kata: "BAAILEYS", hint: "Library WhatsApp untuk Node.js" },
  { kata: "JAKARTA", hint: "Ibu kota Indonesia" },
  { kata: "BANDUNG", hint: "Kota kembang" },
  { kata: "SURABAYA", hint: "Kota pahlawan" },
  { kata: "YOGYAKARTA", hint: "Kota budaya dan pelajar" },
  { kata: "BALI", hint: "Pulau dewata" },
  { kata: "KOMPUTER", hint: "Alat elektronik untuk bekerja" },
  { kata: "INTERNET", hint: "Jaringan global" },
  { kata: "SMARTPHONE", hint: "Ponsel pintar" },
  { kata: "PROGRAMMER", hint: "Orang yang membuat program" },
  { kata: "DATABASE", hint: "Tempat menyimpan data" },
  { kata: "SERVER", hint: "Komputer yang melayani request" },
  { kata: "API", hint: "Antarmuka untuk berkomunikasi antar aplikasi" },
  { kata: "GITHUB", hint: "Platform untuk menyimpan kode" },
  { kata: "NODEJS", hint: "Runtime JavaScript" },
  { kata: "REACT", hint: "Library UI dari Facebook" },
  { kata: "TYPESCRIPT", hint: "JavaScript dengan type" }
]

// Active games storage
const activeGames = new Map()

const handler = async (m, Obj) => {
  const { conn, q, button, text, sender, isGroup } = Obj

  if (!isGroup) {
    return conn.sendMessage(m.chat, {
      text: "❌ Game ini hanya bisa dimainkan di grup!"
    }, { quoted: q('fkontak') })
  }

  const gameKey = `${m.chat}_${sender}`
  const currentGame = activeGames.get(gameKey)

  // Check if answering
  if (text && currentGame) {
    const jawaban = text.toUpperCase().trim()
    
    if (jawaban === currentGame.kata) {
      // Correct answer
      activeGames.delete(gameKey)
      
      const winText = `
╭━━━❰ *TEBAK KATA* ❱━━━╮
┃
┃ 🎉 *SELAMAT!*
┃
┃ ✅ Jawaban benar!
┃ 📖 Kata: *${currentGame.kata}*
┃
┃ 🏆 Kamu menang!
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

      const buttons = [
        ...button.flow.quickReply("🎮 Main Lagi", ".tebakkata"),
        ...button.flow.quickReply("📋 Menu", ".menuplug")
      ]

      return button.sendInteractive(winText, buttons, {
        title: "You Win!",
        body: "Jawaban benar!"
      })
    } else {
      // Wrong answer
      currentGame.attempts++
      
      if (currentGame.attempts >= 3) {
        activeGames.delete(gameKey)
        
        const loseText = `
╭━━━❰ *TEBAK KATA* ❱━━━╮
┃
┃ 😢 *GAME OVER*
┃
┃ ❌ Kamu sudah 3x salah
┃ 📖 Jawaban: *${currentGame.kata}*
┃
┃ 💡 *Hint:* ${currentGame.hint}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

        const buttons = [
          ...button.flow.quickReply("🎮 Coba Lagi", ".tebakkata"),
          ...button.flow.quickReply("📋 Menu", ".menuplug")
        ]

        return button.sendInteractive(loseText, buttons, {
          title: "Game Over",
          body: "Better luck next time!"
        })
      }

      return conn.sendMessage(m.chat, {
        text: `❌ *SALAH!*\n\n💡 Hint: ${currentGame.hint}\n📝 Kata: ${currentGame.masked}\n\nPercobaan: ${currentGame.attempts}/3`
      }, { quoted: m })
    }
  }

  // Start new game
  const randomKata = kataKata[Math.floor(Math.random() * kataKata.length)]
  const masked = randomKata.kata.replace(/[AIUEO]/gi, '_').replace(/[^A-Z_]/gi, '_')

  activeGames.set(gameKey, {
    kata: randomKata.kata,
    hint: randomKata.hint,
    masked: masked,
    attempts: 0
  })

  const gameText = `
╭━━━❰ *TEBAK KATA* ❱━━━╮
┃
┃ 🎮 *Game Dimulai!*
┃
┃ 💡 *Hint:* ${randomKata.hint}
┃
┃ 📝 *Kata:* ${masked}
┃ (${randomKata.kata.length} huruf)
┃
┃ 🎯 *Cara Main:*
┃ Reply pesan ini dengan
┃ jawabanmu!
┃
┃ ⚠️ *Kesempatan: 3x*
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

  const buttons = [
    ...button.flow.quickReply("🎯 Jawab", `.tebakkata `),
    ...button.flow.quickReply("❌ Menyerah", ".tebakmenyerah"),
    ...button.flow.quickReply("📋 Menu", ".menuplug")
  ]

  await button.sendInteractive(gameText, buttons, {
    title: "Tebak Kata",
    body: "Game started!"
  })
}

// Give up command
handler.menyerah = async (m, Obj) => {
  const { sender } = Obj
  const gameKey = `${m.chat}_${sender}`
  const currentGame = activeGames.get(gameKey)
  
  if (currentGame) {
    activeGames.delete(gameKey)
    return Obj.conn.sendMessage(m.chat, {
      text: `😢 Kamu menyerah!\n\n📖 Jawabannya adalah: *${currentGame.kata}*`
    }, { quoted: Obj.q('fkontak') })
  }
}

handler.help = ['tebakkata']
handler.tags = ['game']
handler.command = ['tebakkata', 'tebak', 'tebak kata']
handler.group = true

module.exports = handler
