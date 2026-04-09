/**
 * Plugin: cuaca.js
 * Description: Info cuaca kota
 * Command: .cuaca, .weather
 */

const axios = require('axios')

const handler = async (m, Obj) => {
  const { conn, q, button, text } = Obj

  if (!text) {
    const helpText = `
╭━━━❰ *CUACA* ❱━━━╮
┃
┃ 🌤️ Cek info cuaca kota
┃
┃ 📝 *Cara Penggunaan:*
┃
┃ .cuaca NamaKota
┃ .weather NamaKota
┃
┃ *Contoh:*
┃ .cuaca Jakarta
┃ .cuaca Surabaya
┃ .cuaca Bandung
┃
┃ 🌍 *Fitur:*
┃ • Suhu & feels like
┃ • Kelembaban & angin
┃ • Deskripsi cuaca
┃ • Ikon cuaca
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`

    const buttons = [
      ...button.flow.quickReply("🌤️ Jakarta", ".cuaca Jakarta"),
      ...button.flow.quickReply("🌤️ Surabaya", ".cuaca Surabaya"),
      ...button.flow.quickReply("🌤️ Bandung", ".cuaca Bandung"),
      ...button.flow.quickReply("🎮 Tebak Kata", ".tebakkata"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    return button.sendInteractive(helpText, buttons, {
      title: "Weather Info",
      body: "Cek cuaca kota"
    })
  }

  try {
    await conn.sendMessage(m.chat, {
      text: `🌤️ Mencari cuaca untuk *${text}*...`
    }, { quoted: q('fkontak') })

    // Using Open-Meteo API (free, no API key needed)
    // First, get coordinates
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(text)}&count=1&language=id&format=json`
    const geoResponse = await axios.get(geoUrl)

    if (!geoResponse.data.results || geoResponse.data.results.length === 0) {
      throw new Error('Kota tidak ditemukan')
    }

    const location = geoResponse.data.results[0]
    const { latitude, longitude, name, country } = location

    // Get weather data
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`
    const weatherResponse = await axios.get(weatherUrl)
    const current = weatherResponse.data.current

    // Weather code to description
    const weatherCodes = {
      0: "☀️ Cerah",
      1: "🌤️ Cerah Berawan",
      2: "⛅ Berawan Sebagian",
      3: "☁️ Berawan",
      45: "🌫️ Berkabut",
      48: "🌫️ Berkabut",
      51: "🌧️ Gerimis Ringan",
      53: "🌧️ Gerimis Sedang",
      55: "🌧️ Gerimis Lebat",
      61: "🌧️ Hujan Ringan",
      63: "🌧️ Hujan Sedang",
      65: "🌧️ Hujan Lebat",
      71: "🌨️ Salju Ringan",
      73: "🌨️ Salju Sedang",
      75: "🌨️ Salju Lebat",
      95: "⛈️ Badai Petir",
      96: "⛈️ Badai Petir dengan Hujan",
      99: "⛈️ Badai Petir dengan Hujan Lebat"
    }

    const weatherDesc = weatherCodes[current.weather_code] || "🌡️ Tidak diketahui"

    const cuacaText = `
╭━━━❰ *CUACA* ❱━━━╮
┃
┃ 📍 *${name}, ${country}*
┃
┃ ${weatherDesc}
┃
┃ 🌡️ *Suhu:* ${current.temperature_2m}°C
┃ 🌡️ *Terasa:* ${current.apparent_temperature}°C
┃ 💧 *Kelembaban:* ${current.relative_humidity_2m}%
┃ 💨 *Angin:* ${current.wind_speed_10m} km/jam
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

_Data dari Open-Meteo_`

    const buttons = [
      ...button.flow.quickReply("🌤️ Jakarta", ".cuaca Jakarta"),
      ...button.flow.quickReply("🌤️ Surabaya", ".cuaca Surabaya"),
      ...button.flow.quickReply("🌤️ Bandung", ".cuaca Bandung"),
      ...button.flow.quickReply("🎮 Tebak Kata", ".tebakkata"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    await button.sendInteractive(cuacaText, buttons, {
      title: `Cuaca ${name}`,
      body: weatherDesc
    })

  } catch (err) {
    console.error("Cuaca Error:", err)
    
    const buttons = [
      ...button.flow.quickReply("🌤️ Jakarta", ".cuaca Jakarta"),
      ...button.flow.quickReply("🌤️ Surabaya", ".cuaca Surabaya"),
      ...button.flow.quickReply("📋 Menu", ".menuplug")
    ]

    await button.sendInteractive(
      `❌ Kota *${text}* tidak ditemukan!\n\nCoba kota lain seperti:\n• Jakarta\n• Surabaya\n• Bandung\n• Yogyakarta\n• Medan`,
      buttons,
      { title: "Kota Tidak Ditemukan", body: "Coba kota lain" }
    )
  }
}

handler.help = ['cuaca']
handler.tags = ['info']
handler.command = ['cuaca', 'weather', 'cuacakota']

module.exports = handler
