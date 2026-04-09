/**
 * Plugin: jadwalsholat.js
 * Description: Jadwal sholat kota
 * Command: .jadwalsholat, .sholat
 */

const { fetchJson } = require('../Library/myfunction')
const axios = require('axios')

const handler = async (m, Obj) => {
  const { conn, q, button, text } = Obj

  if (!text) {
    const helpText = `
╭━━━❰ *JADWAL SHOLAT* ❱━━━╮
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ .jadwalsholat NamaKota
┃ .sholat NamaKota
┃
┃ *Contoh:*
┃ .sholat Jakarta
┃ .sholat Surabaya
┃ .sholat Bandung
┃
┃ 🕌 *Fitur:*
┃ • Jadwal 5 waktu sholat
┃ • Imsak & Subuh
┃ • Dzuhur, Ashar, Maghrib, Isya
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.quickReply("🕌 Jakarta", ".sholat Jakarta"),
      ...button.flow.quickReply("🕌 Surabaya", ".sholat Surabaya"),
      ...button.flow.quickReply("🕌 Bandung", ".sholat Bandung"),
      ...button.flow.quickReply("📖 Surah", ".surah"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    return button.sendInteractive(helpText, buttons, {
      title: "Jadwal Sholat",
      body: "Cek jadwal sholat kota"
    })
  }

  try {
    await conn.sendMessage(m.chat, {
      text: `🕌 Mencari jadwal sholat untuk *${text}*...`
    }, { quoted: q('fkontak') })

    // API jadwal sholat
    const apiUrl = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(text)}&country=Indonesia&method=11`
    const response = await axios.get(apiUrl)

    if (!response.data || !response.data.data) {
      throw new Error('Kota tidak ditemukan')
    }

    const { timings, date } = response.data.data
    const { readable, hijri } = date

    const jadwalText = `
╭━━━❰ *JADWAL SHOLAT* ❱━━━╮
┃
┃ 📍 *Kota:* ${text}
┃ 📅 *Masehi:* ${readable}
┃ 🌙 *Hijriah:* ${hijri.day} ${hijri.month.en} ${hijri.year}
┃
┃ 🕌 *Waktu Sholat:*
┃
┃ 🌅 *Imsak:* ${timings.Imsak}
┃ 🌄 *Subuh:* ${timings.Fajr}
┃ ☀️ *Terbit:* ${timings.Sunrise}
┃ 🌞 *Dzuhur:* ${timings.Dhuhr}
┃ 🌤️ *Ashar:* ${timings.Asr}
┃ 🌅 *Maghrib:* ${timings.Maghrib}
┃ 🌙 *Isya:* ${timings.Isha}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

_🤲 Jangan lupa sholat tepat waktu!_`

    const buttons = [
      ...button.flow.quickReply("🕌 Jakarta", ".sholat Jakarta"),
      ...button.flow.quickReply("🕌 Surabaya", ".sholat Surabaya"),
      ...button.flow.quickReply("🕌 Bandung", ".sholat Bandung"),
      ...button.flow.quickReply("📖 Surah", ".surah"),
      ...button.flow.quickReply("✨ Asmaul Husna", ".asmaulhusna"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    await button.sendInteractive(jadwalText, buttons, {
      title: `Jadwal Sholat ${text}`,
      body: readable,
      thumbnailUrl: "https://files.catbox.moe/5x2b8n.jpg"
    })

  } catch (err) {
    console.error("Jadwal Sholat Error:", err)
    
    const buttons = [
      ...button.flow.quickReply("🕌 Jakarta", ".sholat Jakarta"),
      ...button.flow.quickReply("🕌 Surabaya", ".sholat Surabaya"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    await button.sendInteractive(
      `❌ Kota *${text}* tidak ditemukan!\n\nCoba kota lain seperti:\n• Jakarta\n• Surabaya\n• Bandung\n• Yogyakarta\n• Medan`,
      buttons,
      { title: "Kota Tidak Ditemukan", body: "Coba kota lain" }
    )
  }
}

handler.help = ['jadwalsholat']
handler.tags = ['islam']
handler.command = ['jadwalsholat', 'sholat', 'jadwalsolat', 'solat']

module.exports = handler
