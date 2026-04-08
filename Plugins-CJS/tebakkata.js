/**
 * Tebak Kata Plugin (Game)
 * Category: createmenu (fun game)
 * Feature: Game tebak kata
 */

const fs = require('fs')
const path = require('path')

// Database soal tebak kata
const soalTebakKata = [
  { soal: 'Apa ibu kota Indonesia?', jawaban: 'jakarta', hint: 'J___rta' },
  { soal: 'Hewan apa yang bisa terbang?', jawaban: 'burung', hint: 'B_ru_g' },
  { soal: 'Buah berwarna kuning melengkung?', jawaban: 'pisang', hint: 'P_sa_g' },
  { soal: 'Planet ketiga dari matahari?', jawaban: 'bumi', hint: 'B_mi' },
  { soal: 'Hewan terbesar di dunia?', jawaban: 'paus', hint: 'P_us' },
  { soal: 'Mata uang Indonesia?', jawaban: 'rupiah', hint: 'R_p_ah' },
  { soal: 'Hari kemerdekaan Indonesia?', jawaban: '17 agustus', hint: '17 A_g_st_s' },
  { soal: 'Pulau terbesar di Indonesia?', jawaban: 'kalimantan', hint: 'K_l_m_nt_n' },
  { soal: 'Gunung tertinggi di Indonesia?', jawaban: 'puncak jaya', hint: 'P_n_ak J_y_' },
  { soal: 'Sungai terpanjang di Indonesia?', jawaban: 'kapuas', hint: 'K_p_as' },
  { soal: 'Danau terbesar di Indonesia?', jawaban: 'toba', hint: 'T_b_' },
  { soal: 'Tarian tradisional dari Bali?', jawaban: 'kecak', hint: 'K_c_k' },
  { soal: 'Candi terbesar di Indonesia?', jawaban: 'borobudur', hint: 'B_rob_d_r' },
  { soal: 'Alat musik tradisional dari Jawa Barat?', jawaban: 'angklung', hint: 'A_ngl_ng' },
  { soal: 'Makanan khas dari Padang?', jawaban: 'rendang', hint: 'R_nd_ng' }
]

// Session storage
const GAME_PATH = path.join(__dirname, '../data/tebakkata_game.json')

const loadGames = () => {
  if (!fs.existsSync(GAME_PATH)) {
    fs.mkdirSync(path.dirname(GAME_PATH), { recursive: true })
    return {}
  }
  try {
    return JSON.parse(fs.readFileSync(GAME_PATH, 'utf8'))
  } catch {
    return {}
  }
}

const saveGames = (data) => {
  fs.writeFileSync(GAME_PATH, JSON.stringify(data, null, 2))
}

const handler = async (m, Obj) => {
  const { conn, q, args, text } = Obj

  const games = loadGames()
  const action = args[0]?.toLowerCase()

  if (action === 'start' || action === 'mulai') {
    // Mulai game baru
    const soal = soalTebakKata[Math.floor(Math.random() * soalTebakKata.length)]
    
    games[m.chat] = {
      soal: soal,
      attempts: 0,
      maxAttempts: 3,
      startedAt: Date.now(),
      hintUsed: false
    }
    saveGames(games)

    await conn.sendMessage(m.chat, {
      text: `
╭───〔 *TEBAK KATA* 〕───╮
│
│ 🎮 *Game Dimulai!*
│
│ ❓ *Soal:*
│ ${soal.soal}
│
│ 💡 *Ketik jawabanmu*
│ • Max percobaan: 3x
│ • .tebakkata hint → Bantuan
│ • .tebakkata nyerah → Menyerah
│
╰─────────────────────╯
      `.trim(),
      footer: "Tebak Kata Game",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "💡 Bantuan",
            id: ".tebakkata hint"
          })
        },
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "🏳️ Nyerah",
            id: ".tebakkata nyerah"
          })
        }
      ]
    }, { quoted: q('fkontak') })

  } else if (action === 'hint' || action === 'bantuan') {
    // Berikan hint
    if (!games[m.chat]) {
      return conn.sendMessage(m.chat, {
        text: "❌ Tidak ada game yang berjalan!\n\nKetik .tebakkata start untuk mulai"
      }, { quoted: q('fkontak') })
    }

    games[m.chat].hintUsed = true
    saveGames(games)

    await conn.sendMessage(m.chat, {
      text: `
╭───〔 *BANTUAN* 〕───╮
│
│ 💡 *Hint:*
│ ${games[m.chat].soal.hint}
│
╰─────────────────────╯
      `.trim()
    }, { quoted: q('fkontak') })

  } else if (action === 'nyerah' || action === 'menyerah') {
    // Menyerah
    if (!games[m.chat]) {
      return conn.sendMessage(m.chat, {
        text: "❌ Tidak ada game yang berjalan!"
      }, { quoted: q('fkontak') })
    }

    const jawaban = games[m.chat].soal.jawaban
    delete games[m.chat]
    saveGames(games)

    await conn.sendMessage(m.chat, {
      text: `
╭───〔 *GAME OVER* 〕───╮
│
│ 🏳️ Kamu menyerah!
│
│ ✅ *Jawaban:*
│ ${jawaban}
│
│ 🔄 Ketik .tebakkata start
│ untuk main lagi
│
╰─────────────────────╯
      `.trim(),
      footer: "Tebak Kata",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "🔄 Main Lagi",
            id: ".tebakkata start"
          })
        }
      ]
    }, { quoted: q('fkontak') })

  } else if (action === 'stop') {
    // Hentikan game
    if (!games[m.chat]) {
      return conn.sendMessage(m.chat, {
        text: "❌ Tidak ada game yang berjalan!"
      }, { quoted: q('fkontak') })
    }

    delete games[m.chat]
    saveGames(games)

    await conn.sendMessage(m.chat, {
      text: "✅ *Game dihentikan!*"
    }, { quoted: q('fkontak') })

  } else if (action === 'help' || action === 'bantuan') {
    // Menu bantuan
    await conn.sendMessage(m.chat, {
      text: `
╭───〔 *TEBAK KATA - HELP* 〕───╮
│
│ 🎮 *Cara Bermain:*
│
│ 1. Ketik .tebakkata start
│ 2. Baca soal dengan teliti
│ 3. Ketik jawabanmu langsung
│ 4. Jawaban benar = Menang!
│
│ 📋 *Perintah:*
│ • .tebakkata start
│ • .tebakkata hint
│ • .tebakkata nyerah
│ • .tebakkata stop
│
│ 💡 *Tips:*
│ • Jawaban tidak case sensitive
│ • Spasi diabaikan
│ • Gunakan hint jika stuck
│
╰──────────────────────────╯
      `.trim()
    }, { quoted: q('fkontak') })

  } else {
    // Cek apakah ada game berjalan dan ini adalah jawaban
    if (games[m.chat] && text && !text.startsWith('.')) {
      const game = games[m.chat]
      const jawabanUser = text.toLowerCase().trim()
      const jawabanBenar = game.soal.jawaban.toLowerCase()

      game.attempts++

      if (jawabanUser === jawabanBenar) {
        // Jawaban benar
        delete games[m.chat]
        saveGames(games)

        await conn.sendMessage(m.chat, {
          text: `
╭───〔 *SELAMAT!* 〕───╮
│
│ 🎉 *Jawaban Benar!*
│
│ ✅ ${jawabanBenar}
│
│ 📊 *Statistik:*
│ • Percobaan: ${game.attempts}x
│ • Hint: ${game.hintUsed ? 'Digunakan' : 'Tidak'}
│
│ 🔄 Ketik .tebakkata start
│ untuk main lagi!
│
╰─────────────────────╯
          `.trim(),
          footer: "Tebak Kata",
          interactiveButtons: [
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: "🔄 Main Lagi",
                id: ".tebakkata start"
              })
            }
          ]
        }, { quoted: q('fkontak') })

      } else {
        // Jawaban salah
        if (game.attempts >= game.maxAttempts) {
          delete games[m.chat]
          saveGames(games)

          await conn.sendMessage(m.chat, {
            text: `
╭───〔 *GAME OVER* 〕───╮
│
│ ❌ *Kesempatan habis!*
│
│ ✅ *Jawaban:*
│ ${jawabanBenar}
│
│ 🔄 Ketik .tebakkata start
│ untuk main lagi
│
╰─────────────────────╯
            `.trim(),
            footer: "Tebak Kata",
            interactiveButtons: [
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "🔄 Main Lagi",
                  id: ".tebakkata start"
                })
              }
            ]
          }, { quoted: q('fkontak') })
        } else {
          saveGames(games)

          await conn.sendMessage(m.chat, {
            text: `
╭───〔 *SALAH!* 〕───╮
│
│ ❌ *Jawaban salah!*
│
│ 💭 "${text}"
│
│ 📊 Sisa percobaan: ${game.maxAttempts - game.attempts}x
│
╰─────────────────────╯
            `.trim(),
            footer: "Tebak Kata",
            interactiveButtons: [
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "💡 Hint",
                  id: ".tebakkata hint"
                })
              }
            ]
          }, { quoted: q('fkontak') })
        }
      }
    } else {
      // Menu utama
      await conn.sendMessage(m.chat, {
        text: `
╭───〔 *TEBAK KATA* 〕───╮
│
│ 🎮 Game tebak kata seru!
│
│ 📋 *Perintah:*
│
│ • .tebakkata start
│   → Mulai game baru
│
│ • .tebakkata hint
│   → Minta bantuan
│
│ • .tebakkata nyerah
│   → Menyerah
│
│ • .tebakkata help
│   → Bantuan lengkap
│
╰─────────────────────╯
        `.trim(),
        footer: "Tebak Kata Game",
        interactiveButtons: [
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "🎮 Mulai Game",
              id: ".tebakkata start"
            })
          },
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "📋 Bantuan",
              id: ".tebakkata help"
            })
          }
        ]
      }, { quoted: q('fkontak') })
    }
  }
}

// Export untuk message handler
handler.loadGames = loadGames
handler.saveGames = saveGames

handler.help = ['tebakkata', 'tebak', 'gamekata']
handler.tags = ['createmenu']
handler.command = ["tebakkata", "tebak", "gamekata"]
handler.game = true

module.exports = handler
