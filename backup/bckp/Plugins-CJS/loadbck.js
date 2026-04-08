const fs = require("fs")
const path = require("path")

module.exports = async (m, Obj) => {
  const { conn, q } = Obj

  // ===== FIND LATEST BACKUP =====
  const backupDir = path.join(process.cwd(), "backup")
  if (!fs.existsSync(backupDir)) {
    return await conn.sendMessage(m.chat, {
      text: "❌ Folder backup tidak ditemukan!\nJalankan .testfull dulu untuk membuat backup."
    }, { quoted: q('fkontak') })
  }

  const backupFiles = fs.readdirSync(backupDir)
    .filter(file => file.endsWith('.json') && file.includes('button-test-full-backup'))
    .map(file => ({
      name: file,
      path: path.join(backupDir, file),
      time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time)

  if (backupFiles.length === 0) {
    return await conn.sendMessage(m.chat, {
      text: "❌ Tidak ada file backup ditemukan."
    }, { quoted: q('fkontak') })
  }

  const latestBackup = backupFiles[0]
  console.log(`[RESTORE] Menggunakan backup terbaru: ${latestBackup.name}`)

  // ===== LOAD BACKUP JSON =====
  let backupData
  try {
    backupData = JSON.parse(fs.readFileSync(latestBackup.path, "utf-8"))
  } catch (err) {
    return await conn.sendMessage(m.chat, {
      text: `❌ Gagal membaca backup:\n${err.message}`
    }, { quoted: q('fkontak') })
  }

  // ===== CREATE RESTORED FOLDER =====
  const restoredDir = path.join(process.cwd(), "restored")
  if (!fs.existsSync(restoredDir)) {
    fs.mkdirSync(restoredDir, { recursive: true })
  }

  const restoredPath = path.join(restoredDir, `button-api-restored-${Date.now()}.js`)

  // ===== BUILD CLEAN SOURCE CODE =====
  let restoredCode = `// =============================================
// 🔄 BUTTON API + FLOW + UI RESTORED OTOMATIS
// Dari backup: ${latestBackup.name}
// Dibuat otomatis pada: ${new Date().toISOString()}
// =============================================

const buildRestoredButton = (m, Obj) => {
  const { conn, q } = Obj

  // ===== BUTTON API (sudah jadi function siap pakai) =====
  const buttonAPI = {
`

  // Tambahkan semua buttonAPI
  Object.keys(backupData.buttonAPI || {}).forEach(key => {
    const source = backupData.buttonAPI[key]
    restoredCode += `    ${key}: ${source},\n\n`
  })

  restoredCode += `  }

  // ===== FLOW PRESETS (sudah jadi object function) =====
  const flow = {
`

  // Tambahkan semua flowPresets
  Object.keys(backupData.flowPresets || {}).forEach(key => {
    const source = backupData.flowPresets[key]
    restoredCode += `    ${key}: ${source},\n\n`
  })

  restoredCode += `  }

  // ===== UI API (sudah jadi function siap pakai) =====
  const uiAPI = {
`

  // Tambahkan semua uiAPI
  Object.keys(backupData.uiAPI || {}).forEach(key => {
    const source = backupData.uiAPI[key]
    restoredCode += `    ${key}: ${source},\n\n`
  })

  restoredCode += `  }

  // ===== RETURN SEMUA FUNCTION SEBAGAI OBJECT =====
  return {
    ...buttonAPI,
    flow,
    ui: uiAPI,
    sendFlow: buttonAPI.sendFlow || buttonAPI.sendInteractive,
    sendInteractive: buttonAPI.sendInteractive
  }
}

// Contoh cara pakai setelah restore:
// const { sendInteractive, flow } = buildRestoredButton(m, Obj)
// await sendInteractive("Test restore", flow.hybridMenu())

module.exports = buildRestoredButton
`

  // ===== SIMPAN FILE RESTORED =====
  fs.writeFileSync(restoredPath, restoredCode)

  console.log(`✅ RESTORE BERHASIL → ${restoredPath}`)

  // ===== KIRIM NOTIFIKASI KE USER =====
  await conn.sendMessage(m.chat, {
    text: `✅ BERHASIL RESTORE OTOMATIS!\n\n` +
          `📄 File telah dibuat:\n` +
          `\`${restoredPath}\`\n\n` +
          `✅ Isi file sudah berupa:\n` +
          `• buttonAPI → function siap pakai\n` +
          `• flow → object function (quickReply, hybridMenu, dll)\n` +
          `• uiAPI → function siap pakai\n\n` +
          `Cara pakai:\n` +
          `1. Copy isi file tersebut\n` +
          `2. Ganti module.exports di file buildButton.js kamu\n` +
          `3. Atau import langsung di plugin lain\n\n` +
          `Semua function & variable sekarang sudah otomatis jadi logika JS yang bisa langsung dijalankan! 🚀`
  }, { quoted: q('fkontak') })

  // Kirim juga contoh penggunaan
  await conn.sendMessage(m.chat, {
    text: `📋 Contoh penggunaan setelah restore:\n\n` +
          `const restored = buildRestoredButton(m, { conn, q })\n` +
          `await restored.sendInteractive("Test restored button", restored.flow.hybridMenu())`
  }, { quoted: q('fkontak') })
}

module.exports.command = ["loadbck", "restorebackup", "loadbackup", "backuprestore", "restorbutton"]