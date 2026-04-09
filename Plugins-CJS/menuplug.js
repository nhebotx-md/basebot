/**
 * Plugin: menuplug.js
 * Description: Menu utama dengan tampilan interaktif button
 * Author: NHE Bot System
 */

const handler = async (m, Obj) => {
  const { conn, q, button, isGroup, groupName, pushname } = Obj

  const botName = global.botname || "NHE BOT"
  const version = global.version || "2.0.0"
  const ownerName = global.namaowner || "Owner"

  // Menu text utama
  const menuText = `
╭━━━❰ *${botName}* ❱━━━╮
┃
┃ ⏰ Waktu: ${new Date().toLocaleTimeString('id-ID')}
┃ 👤 User: ${pushname}
┃ ${isGroup ? `👥 Group: ${groupName}` : '💬 Chat: Private'}
┃
╰━━━━━━━━━━━━━━━━╯

📂 *PILIH KATEGORI MENU:*

Ketik atau pilih kategori di bawah:`

  // Sections untuk single select menu
  const sections = [
    {
      title: "🏘️ Group Features",
      rows: [
        { title: "📊 Group Info", description: "Info lengkap grup", id: ".groupinfo" },
        { title: "🔗 Anti Link", description: "Pengaturan anti link", id: ".antilink" },
        { title: "🛡️ Anti Spam", description: "Pengaturan anti spam", id: ".antispam" },
        { title: "📊 Group Poll", description: "Buat polling/voting", id: ".grouppoll" }
      ]
    },
    {
      title: "🎨 Sticker Features",
      rows: [
        { title: "🏷️ Sticker WM", description: "Sticker dengan watermark", id: ".stickerwm" },
        { title: "😂 Meme Sticker", description: "Meme sticker generator", id: ".stickermeme" },
        { title: "⚡ Triggered", description: "Triggered effect sticker", id: ".trigger" }
      ]
    },
    {
      title: "⬇️ Download Features",
      rows: [
        { title: "🎵 Play YouTube", description: "Play & download audio", id: ".play" },
        { title: "🎬 YouTube Video", description: "Download video YouTube", id: ".ytvideo" },
        { title: "🎧 Spotify", description: "Download lagu Spotify", id: ".spotify" }
      ]
    },
    {
      title: "🛠️ Create Features",
      rows: [
        { title: "🔲 QR Code", description: "Generate QR Code", id: ".qrcode" },
        { title: "📝 Nulis", description: "Nulis ke gambar buku", id: ".nulis" },
        { title: "💬 Quote", description: "Quote maker aesthetic", id: ".quote" }
      ]
    },
    {
      title: "🕌 Islam Features",
      rows: [
        { title: "🕋 Jadwal Sholat", description: "Jadwal sholat kota", id: ".jadwalsholat" },
        { title: "📖 Surah Quran", description: "Baca surah Al-Quran", id: ".surah" },
        { title: "✨ Asmaul Husna", description: "99 Nama Allah", id: ".asmaulhusna" }
      ]
    },
    {
      title: "🤖 AI Features",
      rows: [
        { title: "💭 AI Chat", description: "Chat dengan AI GPT", id: ".ai" },
        { title: "🎨 AI Image", description: "Generate gambar AI", id: ".aimage" }
      ]
    },
    {
      title: "👑 Owner Features",
      rows: [
        { title: "📢 Broadcast", description: "Broadcast ke semua chat", id: ".broadcast" },
        { title: "🗑️ Clear Chat", description: "Hapus semua chat", id: ".clearchat" }
      ]
    },
    {
      title: "🎮 Bonus Features",
      rows: [
        { title: "🎯 Tebak Kata", description: "Game tebak kata", id: ".tebakkata" },
        { title: "🌤️ Cuaca", description: "Info cuaca kota", id: ".cuaca" }
      ]
    }
  ]

  // Hybrid buttons: Quick reply + Single select
  const interactiveButtons = [
    // Quick Reply buttons
    ...button.flow.quickReply("📋 Menu Utama", ".menu"),
    ...button.flow.quickReply("👤 Owner", ".owner"),
    // Single Select menu
    ...button.flow.singleSelect("📂 Pilih Kategori", sections, "Pilih menu di sini"),
    // CTA URL
    ...button.flow.ctaUrl("🌐 Website", "https://github.com/nhebotx-md/basebot"),
    // CTA Call
    ...button.flow.ctaCall("📞 Hubungi Owner", global.owner?.[0]?.replace(/[^0-9]/g, '') || "62881027174423")
  ]

  // Send interactive message
  await button.sendInteractive(menuText, interactiveButtons, {
    title: `${botName} Menu System`,
    body: `Version ${version} | By ${ownerName}`,
    thumbnailUrl: global.thumbnail || "https://files.catbox.moe/5x2b8n.jpg",
    footer: "© NHE SYSTEM"
  })
}

handler.help = ['menuplug']
handler.tags = ['main']
handler.command = ['menuplug', 'menup', 'mplug']

module.exports = handler
