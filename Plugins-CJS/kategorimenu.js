/**
 * Plugin: kategorimenu.js
 * Description: Menu kategori otomatis dari tags plugin
 */

const categoryConfig = {
  ai: { title: "AI Menu", emoji: "🤖", description: "Chat dan gambar AI" },
  create: { title: "Create Menu", emoji: "🛠️", description: "Tools pembuatan konten" },
  download: { title: "Download Menu", emoji: "⬇️", description: "Downloader media" },
  game: { title: "Game Menu", emoji: "🎮", description: "Menu game dan hiburan" },
  group: { title: "Group Menu", emoji: "👥", description: "Fitur khusus grup" },
  islam: { title: "Islam Menu", emoji: "🕌", description: "Fitur islami" },
  owner: { title: "Owner Menu", emoji: "👑", description: "Perintah owner" },
  sticker: { title: "Sticker Menu", emoji: "🎨", description: "Tools sticker" },
  info: { title: "Info Menu", emoji: "ℹ️", description: "Info dan utilitas" },
  main: { title: "Kategori Menu", emoji: "📂", description: "Daftar semua kategori" },
}

const labelFromPlugin = (plugin) => {
  const name = plugin?.help?.[0] || plugin?.command?.[0] || "unknown"
  return String(name)
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
}

const buildSectionsFromPlugins = (pluginsByTag, tag) => {
  const items = pluginsByTag.get(tag) || []

  return [
    {
      title: `${categoryConfig[tag]?.emoji || "📁"} ${categoryConfig[tag]?.title || tag}`,
      rows: items.map((plugin) => {
        const primaryCommand = plugin.command?.[0] || plugin.help?.[0] || ""
        const desc = Array.isArray(plugin.help) && plugin.help.length
          ? plugin.help.join(", ")
          : primaryCommand

        return {
          title: labelFromPlugin(plugin),
          description: desc,
          id: `.${primaryCommand}`
        }
      })
    }
  ]
}

// 🔥 NEW: BUTTON PER KATEGORI
const buildCategoryButtons = (index, tags, button) => {
  return tags
    .filter(tag => (index.get(tag) || []).length > 0)
    .map(tag => {
      const data = categoryConfig[tag] || {}
      const total = (index.get(tag) || []).length

      return button.flow.quickReply(
        `${data.emoji || "📁"} ${data.title || tag} (${total})`,
        `.menu-${tag}` // 🔥 command dinamis
      )
    })
}

const handler = async (m, Obj) => {
  const { button, conn, q, replyAdaptive } = Obj

  const plugins = Obj.plugins || global.plugins
  const index = plugins?.byTag

  if (!index || typeof index.get !== "function") {
    return replyAdaptive({
      text: "❌ Index plugin belum tersedia.\nCoba ulangi beberapa detik lagi.",
      title: "Error",
      body: "Plugin Index Not Ready"
    })
  }

  const availableTags = [
    "ai","create","download","game",
    "group","islam","owner","sticker","info"
  ]

  const time = new Date().toLocaleTimeString("id-ID")
  const botName = global.botname || "NHE BOT"
  const ownerName = global.namaowner || "Owner"

  const menuText = `
╭━━━❰ *${botName}* ❱━━━╮
┃
┃ ⏰ Waktu: ${time}
┃ 👤 User: ${Obj.pushname || "User"}
┃
╰━━━━━━━━━━━━━━━━╯

📂 *PILIH KATEGORI MENU*
Klik tombol kategori atau gunakan list di bawah.
`

  const sections = availableTags
    .filter(tag => (index.get(tag) || []).length > 0)
    .map(tag => buildSectionsFromPlugins(index, tag))
    .flat()

  if (!sections.length) {
    return replyAdaptive({
      text: "⚠️ Tidak ada kategori tersedia.",
      title: "Warning",
      body: "No Categories Available"
    })
  }

  // 🔥 BUTTON KATEGORI
  const categoryButtons = buildCategoryButtons(index, availableTags, button)

  const buttons = [
    ...button.flow.quickReply("📋 Menu Utama", ".menuplug"),
    ...button.flow.quickReply("👑 Owner", ".ownermenu"),

    // 🔥 kategori langsung klik
    ...categoryButtons,

    // 🔥 fallback list lengkap
    ...button.flow.singleSelect("📂 Semua Kategori", sections, "Pilih kategori menu"),

    ...button.flow.ctaUrl("🌐 Repo", "https://github.com/nhebotx-md/basebot"),
  ]

  await replyAdaptive({
    text: menuText,
    buttons: buttons,
    title: `${botName} Category Menu`,
    body: `By ${ownerName}`,
    thumbnailUrl: global.thumbnail || "https://files.catbox.moe/5x2b8n.jpg",
    footer: "© NHE SYSTEM"
  })
}

handler.help = ["kategorimenu"]
handler.tags = ["main"]
handler.command = ["kategorimenu", "katmenu", "categories", "menukategori"]

module.exports = handler
