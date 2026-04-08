const buildButton = (m, Obj) => {
  const { conn, q } = Obj

  // ===== BASE INTERACTIVE SENDER (UPDATED untuk itsukichan Baileys) =====
  // Menggunakan format modern interactiveButtons yang support:
  // - quick_reply (tombol biasa)
  // - single_select (list/menu dropdown)
  // - cta_url (tombol link)
  // - cta_call (tombol panggil)
  // Bisa dikombinasikan dalam 1 pesan (hybrid button)!
  const sendInteractive = async (text, interactiveButtons = [], opt = {}) => {
    const {
      type = 'fkontak',                    // tipe quoted (fkontak, etc.)
      title = global.botname || "NHE BOT",
      body = "Interactive Menu",
      thumbnailUrl = "https://files.catbox.moe/5x2b8n.jpg",
      sourceUrl = "https://wa.me/62881027174423",
      footer = "© NHE SYSTEM"
    } = opt

    const msg = {
      text,
      footer,
      interactiveButtons,                   // ← format baru itsukichan
      headerType: 1,
      contextInfo: {
        externalAdReply: {
          title,
          body,
          thumbnailUrl,
          sourceUrl,
          renderLargerThumbnail: true
        }
      }
    }

    return await conn.sendMessage(
      m.chat,
      msg,
      { quoted: q(type) }
    )
  }

  // ===== FLOW PRESET (UPDATED ke format modern + tambahan tipe button) =====
  const flow = {}

  // Quick Reply (tombol biasa, max 3, bisa dikombinasikan dengan yang lain)
  flow.quickReply = (displayText, id) => ([{
    name: "quick_reply",
    buttonParamsJson: JSON.stringify({
      display_text: displayText,
      id: id || displayText.toLowerCase().replace(/\s/g, '')
    })
  }])

  // Single Select (dropdown menu / list)
  flow.singleSelect = (title, sections = [], highlightLabel = "") => ([{
    name: "single_select",
    buttonParamsJson: JSON.stringify({
      title: title || "Pilih Menu",
      sections: sections.length ? sections : [{
        title: "Main Menu",
        rows: []
      }],
      ...(highlightLabel && { highlight_label: highlightLabel })
    })
  }])

  // CTA URL (tombol link)
  flow.ctaUrl = (displayText, url) => ([{
    name: "cta_url",
    buttonParamsJson: JSON.stringify({
      display_text: displayText,
      url: url,
      merchant_url: url
    })
  }])

  // CTA Call (tombol panggil nomor)
  flow.ctaCall = (displayText, phone) => ([{
    name: "cta_call",
    buttonParamsJson: JSON.stringify({
      display_text: displayText,
      id: phone
    })
  }])

  // ===== MENU LAMA DI-UPDATE (masih kompatibel) =====
  flow.menu = () => flow.singleSelect(
    "Select Menu",
    [{
      title: "Main Menu",
      rows: [
        { title: "📦 Panel", description: "Buka Panel", id: ".panel" },
        { title: "🤖 AI", description: "AI Assistant", id: ".ai" },
        { title: "🎮 Game", description: "Game Menu", id: ".game" }
      ]
    }]
  )

  flow.fullMenu = (botname = global.botname || "NHE BOT") => flow.singleSelect(
    "📂 All Menu",
    [
      {
        title: "Populer 🔥",
        rows: [
          {
            title: "🛒 STORE",
            description: "Menu Store & Jualan",
            id: ".storemenu"
          }
        ]
      },
      {
        title: botname,
        rows: [
          { title: "💻 PANEL", description: "Panel Management", id: ".panel" },
          { title: "⬇️ DOWNLOAD", description: "Download Menu", id: ".downloadmenu" },
          { title: "🔮 AI MENU", description: "AI Tools", id: ".aimenu" }
        ]
      }
    ]
  )

  // ===== CONTOH KOMBINASI BUTTON (super interactive) =====
  // Contoh: tombol cepat + list + link + call dalam 1 pesan
  flow.hybridMenu = (botname) => ([
    // Quick Reply (tombol biasa)
    ...flow.quickReply("📋 Menu Utama", ".menu"),
    ...flow.quickReply("🔍 Cari", ".search"),
    // Single Select (list lengkap)
    ...flow.singleSelect(
      "📂 Full Menu",
      [
        {
          title: "Populer 🔥",
          rows: [{ title: "🛒 STORE", description: "Menu Store", id: ".storemenu" }]
        },
        {
          title: botname || "NHE BOT",
          rows: [
            { title: "💻 PANEL", description: "Panel", id: ".panel" },
            { title: "⬇️ DOWNLOAD", description: "Download", id: ".downloadmenu" },
            { title: "🔮 AI", description: "AI Menu", id: ".aimenu" }
          ]
        }
      ]
    ),
    // CTA URL
    ...flow.ctaUrl("🌐 Website", "https://example.com"),
    // CTA Call
    ...flow.ctaCall("📞 Hubungi Owner", "62881027174423")
  ])

  // ===== RETURN API (sendFlow tetap ada tapi sekarang pakai format baru) =====
  return {
    sendFlow: sendInteractive,     // ← tetap nama lama, tapi lebih powerful
    sendInteractive,               // nama baru yang lebih jelas
    flow
  }
}

module.exports = buildButton