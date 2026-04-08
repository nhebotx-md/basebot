/**
 * Jadwal Sholat Plugin
 * Category: islammenu
 * Feature: Menampilkan jadwal sholat berdasarkan kota
 */

const axios = require('axios')
const fs = require('fs')
const path = require('path')

// Cache jadwal sholat
const CACHE_PATH = path.join(__dirname, '../data/sholat_cache.json')

const loadCache = () => {
  if (!fs.existsSync(CACHE_PATH)) {
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true })
    return {}
  }
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'))
  } catch {
    return {}
  }
}

const saveCache = (data) => {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2))
}

const handler = async (m, Obj) => {
  const { conn, q, args, text, button } = Obj

  const kota = text || 'Jakarta'
  const kotaLower = kota.toLowerCase()

  try {
    await conn.sendMessage(m.chat, {
      text: `🔍 Mencari jadwal sholat untuk *${kota}*...`
    }, { quoted: q('fkontak') })

    // Cek cache
    const cache = loadCache()
    const today = new Date().toISOString().split('T')[0]
    const cacheKey = `${kotaLower}_${today}`

    let jadwalData

    if (cache[cacheKey] && cache[cacheKey].timestamp > Date.now() - 86400000) {
      jadwalData = cache[cacheKey].data
    } else {
      // Ambil dari API
      const apiUrl = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(kota)}&country=Indonesia&method=11`
      
      const response = await axios.get(apiUrl, { timeout: 30000 })
      
      if (!response.data || !response.data.data) {
        throw new Error('Data tidak ditemukan')
      }

      jadwalData = response.data.data
      
      // Simpan ke cache
      cache[cacheKey] = {
        data: jadwalData,
        timestamp: Date.now()
      }
      saveCache(cache)
    }

    const timings = jadwalData.timings
    const date = jadwalData.date

    const jadwalText = `
╭───〔 *JADWAL SHOLAT* 〕───╮
│
│ 📍 *Kota:* ${kota}
│ 📅 *Tanggal:* ${date.readable}
│ 🗓️ *Hijriah:* ${date.hijri.day} ${date.hijri.month.en} ${date.hijri.year}
│
├─────────────────────────
│
│ 🌅 *Imsak:* ${timings.Imsak}
│ 🌄 *Subuh:* ${timings.Fajr}
│ ☀️ *Terbit:* ${timings.Sunrise}
│ 🌞 *Dzuhur:* ${timings.Dhuhr}
│ ☁️ *Ashar:* ${timings.Asr}
│ 🌅 *Maghrib:* ${timings.Maghrib}
│ 🌙 *Isya:* ${timings.Isha}
│
├─────────────────────────
│
│ 📍 *Lokasi:*
│ • Lat: ${jadwalData.meta.latitude}
│ • Long: ${jadwalData.meta.longitude}
│ • Zona: ${jadwalData.meta.timezone}
│
╰─────────────────────────╯
    `.trim()

    // Kirim dengan button pilihan kota
    await conn.sendMessage(m.chat, {
      text: jadwalText,
      footer: "Jadwal Sholat Indonesia",
      interactiveButtons: [
        {
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "📍 Pilih Kota",
            sections: [{
              title: "Kota Populer",
              rows: [
                { title: "🏙️ Jakarta", description: "DKI Jakarta", id: ".jadwalsholat Jakarta" },
                { title: "🏙️ Surabaya", description: "Jawa Timur", id: ".jadwalsholat Surabaya" },
                { title: "🏙️ Bandung", description: "Jawa Barat", id: ".jadwalsholat Bandung" },
                { title: "🏙️ Medan", description: "Sumatera Utara", id: ".jadwalsholat Medan" },
                { title: "🏙️ Semarang", description: "Jawa Tengah", id: ".jadwalsholat Semarang" },
                { title: "🏙️ Yogyakarta", description: "DI Yogyakarta", id: ".jadwalsholat Yogyakarta" },
                { title: "🏙️ Makassar", description: "Sulawesi Selatan", id: ".jadwalsholat Makassar" },
                { title: "🏙️ Bali", description: "Denpasar", id: ".jadwalsholat Denpasar" }
              ]
            }]
          })
        }
      ]
    }, { quoted: q('fkontak') })

  } catch (err) {
    console.error("JadwalSholat Error:", err)
    
    // Fallback: tampilkan jadwal default
    const defaultJadwal = `
╭───〔 *JADWAL SHOLAT* 〕───╮
│
│ 📍 *Kota:* ${kota}
│ ⚠️ Data tidak tersedia
│
│ 🌅 *Imsak:* 04:30
│ 🌄 *Subuh:* 04:45
│ ☀️ *Dzuhur:* 12:00
│ ☁️ *Ashar:* 15:15
│ 🌅 *Maghrib:* 18:00
│ 🌙 *Isya:* 19:15
│
│ 📌 *Catatan:*
│ Waktu di atas adalah
│ perkiraan untuk wilayah
│ Jawa Barat.
│
╰─────────────────────────╯
    `.trim()

    await conn.sendMessage(m.chat, {
      text: defaultJadwal,
      footer: "Jadwal Sholat (Perkiraan)"
    }, { quoted: q('fkontak') })
  }
}

handler.help = ['jadwalsholat', 'sholat', 'jadwalsolat']
handler.tags = ['islammenu']
handler.command = ["jadwalsholat", "sholat", "jadwalsolat", "solat"]

module.exports = handler
