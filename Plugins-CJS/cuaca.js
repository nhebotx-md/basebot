/**
 * Cuaca Plugin
 * Category: createmenu
 * Feature: Cek cuaca berdasarkan kota
 */

const axios = require('axios')

const handler = async (m, Obj) => {
  const { conn, q, args, text, button } = Obj

  if (!text) {
    return conn.sendMessage(m.chat, {
      text: "❌ Masukkan nama kota!",
      footer: "Weather Info",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Contoh",
            id: ".cuaca example"
          })
        },
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "🌤️ Jakarta",
            id: ".cuaca Jakarta"
          })
        }
      ]
    }, { quoted: q('fkontak') })
  }

  if (text.toLowerCase() === 'example') {
    return conn.sendMessage(m.chat, {
      text: `
╭───〔 *CUACA INFO* 〕───╮
│
│ 🌤️ Cek cuaca kota
│
│ 📋 *Cara Penggunaan:*
│
│ .cuaca [nama kota]
│
│ 📌 *Contoh:*
│ • .cuaca Jakarta
│ • .cuaca Surabaya
│ • .cuaca Bandung
│ • .cuaca Yogyakarta
│ • .cuaca Bali
│
│ 🌍 *Bisa untuk kota:*
│ • Indonesia
│ • Luar negeri
│ • Dalam bahasa Inggris
│
╰─────────────────────╯
      `.trim()
    }, { quoted: q('fkontak') })
  }

  try {
    await conn.sendMessage(m.chat, {
      text: `🌤️ Mencari cuaca untuk *${text}*...`
    }, { quoted: q('fkontak') })

    // Gunakan API cuaca
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(text)}&appid=YOUR_API_KEY&units=metric&lang=id`
    
    // Fallback API
    const fallbackApis = [
      `https://api.weatherapi.com/v1/current.json?key=demo&q=${encodeURIComponent(text)}&lang=id`,
      `https://wttr.in/${encodeURIComponent(text)}?format=j1`
    ]

    let weatherData = null

    // Coba wttr.in (free, no API key)
    try {
      const response = await axios.get(`https://wttr.in/${encodeURIComponent(text)}?format=j1`, {
        timeout: 30000
      })

      if (response.data && response.data.current_condition) {
        const current = response.data.current_condition[0]
        const location = response.data.nearest_area[0]

        weatherData = {
          kota: location.areaName[0].value,
          negara: location.country[0].value,
          suhu: current.temp_C,
          feelsLike: current.FeelsLikeC,
          kondisi: current.lang_id ? current.lang_id[0].value : current.weatherDesc[0].value,
          kelembaban: current.humidity,
          angin: current.windspeedKmph,
          tekanan: current.pressure,
          visibility: current.visibility,
          uv: current.uvIndex,
          icon: current.weatherCode
        }
      }
    } catch (err) {
      console.error("Weather API Error:", err.message)
    }

    if (!weatherData) {
      throw new Error('Weather data not available')
    }

    // Icon berdasarkan kondisi
    const iconMap = {
      'Sunny': '☀️',
      'Clear': '🌙',
      'Partly cloudy': '⛅',
      'Cloudy': '☁️',
      'Overcast': '🌥️',
      'Mist': '🌫️',
      'Patchy rain possible': '🌦️',
      'Patchy snow possible': '🌨️',
      'Patchy sleet possible': '🌧️',
      'Patchy freezing drizzle possible': '🌨️',
      'Thundery outbreaks possible': '⛈️',
      'Blowing snow': '🌨️',
      'Blizzard': '❄️',
      'Fog': '🌫️',
      'Freezing fog': '🌫️',
      'Patchy light drizzle': '🌧️',
      'Light drizzle': '🌧️',
      'Freezing drizzle': '🌨️',
      'Heavy freezing drizzle': '🌨️',
      'Patchy light rain': '🌦️',
      'Light rain': '🌧️',
      'Moderate rain at times': '🌧️',
      'Moderate rain': '🌧️',
      'Heavy rain at times': '🌧️',
      'Heavy rain': '🌧️',
      'Light freezing rain': '🌨️',
      'Moderate or heavy freezing rain': '🌨️',
      'Light sleet': '🌨️',
      'Moderate or heavy sleet': '🌨️',
      'Patchy light snow': '🌨️',
      'Light snow': '🌨️',
      'Patchy moderate snow': '🌨️',
      'Moderate snow': '❄️',
      'Patchy heavy snow': '❄️',
      'Heavy snow': '❄️',
      'Ice pellets': '🌨️',
      'Light rain shower': '🌦️',
      'Moderate or heavy rain shower': '🌧️',
      'Torrential rain shower': '🌧️',
      'Light sleet showers': '🌨️',
      'Moderate or heavy sleet showers': '🌨️',
      'Light snow showers': '🌨️',
      'Moderate or heavy snow showers': '❄️',
      'Light showers of ice pellets': '🌨️',
      'Moderate or heavy showers of ice pellets': '🌨️',
      'Patchy light rain with thunder': '⛈️',
      'Moderate or heavy rain with thunder': '⛈️',
      'Patchy light snow with thunder': '⛈️',
      'Moderate or heavy snow with thunder': '⛈️'
    }

    const icon = iconMap[weatherData.kondisi] || '🌡️'

    const cuacaText = `
╭───〔 *CUACA HARI INI* 〕───╮
│
│ ${icon} *${weatherData.kota}, ${weatherData.negara}*
│
│ 🌡️ *Suhu:* ${weatherData.suhu}°C
│ 🤔 *Terasa seperti:* ${weatherData.feelsLike}°C
│ ☁️ *Kondisi:* ${weatherData.kondisi}
│
├─────────────────────
│ 💧 *Kelembaban:* ${weatherData.kelembaban}%
│ 💨 *Angin:* ${weatherData.angin} km/jam
│ 🔽 *Tekanan:* ${weatherData.tekanan} mb
│ 👁️ *Visibilitas:* ${weatherData.visibility} km
│ ☀️ *UV Index:* ${weatherData.uv}
│
╰─────────────────────╯
    `.trim()

    await conn.sendMessage(m.chat, {
      text: cuacaText,
      footer: "Weather Information",
      interactiveButtons: [
        {
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "🌤️ Kota Lain",
            sections: [{
              title: "Kota Populer",
              rows: [
                { title: "🌤️ Jakarta", description: "DKI Jakarta", id: ".cuaca Jakarta" },
                { title: "🌤️ Surabaya", description: "Jawa Timur", id: ".cuaca Surabaya" },
                { title: "🌤️ Bandung", description: "Jawa Barat", id: ".cuaca Bandung" },
                { title: "🌤️ Medan", description: "Sumatera Utara", id: ".cuaca Medan" },
                { title: "🌤️ Bali", description: "Denpasar", id: ".cuaca Denpasar" },
                { title: "🌤️ Makassar", description: "Sulawesi Selatan", id: ".cuaca Makassar" }
              ]
            }]
          })
        }
      ]
    }, { quoted: q('fkontak') })

  } catch (err) {
    console.error("Cuaca Error:", err)
    
    // Fallback: tampilkan pesan error dengan rekomendasi
    await conn.sendMessage(m.chat, {
      text: `
╭───〔 *CUACA* 〕───╮
│
│ ⚠️ Data cuaca tidak tersedia
│ untuk *${text}*
│
│ 📌 *Coba kota lain:*
│ • Jakarta
│ • Surabaya
│ • Bandung
│ • Medan
│ • Bali
│
╰─────────────────────╯
      `.trim(),
      footer: "Weather Info",
      interactiveButtons: [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "🌤️ Jakarta",
            id: ".cuaca Jakarta"
          })
        },
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "🌤️ Bandung",
            id: ".cuaca Bandung"
          })
        }
      ]
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['cuaca', 'weather', 'infocuaca']
handler.tags = ['createmenu']
handler.command = ["cuaca", "weather", "infocuaca", "cekcuaca"]

module.exports = handler
