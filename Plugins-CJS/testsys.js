const util = require("util")
const fs = require("fs")

module.exports = async (m, Obj) => {
  const { conn, q, sendUI, ui, button } = Obj

  // ===== LOGGER + AUTO BACKUP SYSTEM =====
  const testResults = []
  const log = (label, status) => {
    const entry = `[TEST] ${label} → ${status}`
    console.log(entry)
    testResults.push({ label, status, timestamp: new Date().toISOString() })
  }

  const logError = async (label, err) => {
    console.error(`\n❌ ERROR [${label}]`)
    console.error("Message:", err.message)
    console.error("Stack:", err.stack)
    console.error("──────────────\n")

    testResults.push({
      label,
      status: "❌ FAILED",
      error: err.message,
      timestamp: new Date().toISOString()
    })

    await conn.sendMessage(m.chat, {
      text: `❌ ERROR [\( {label}]\n \){err.message}`
    }, { quoted: q('fkontak') })
  }

  const safe = async (label, fn) => {
    try {
      await fn()
      log(label, "✅ SUCCESS")
      return true
    } catch (err) {
      await logError(label, err)
      log(label, "❌ FAILED")
      return false
    }
  }

  // ===== AUTO BACKUP HANDLER (source code + successful data) =====
  const backupHandlers = async () => {
    const backup = {
      timestamp: new Date().toISOString(),
      botVersion: global.botname || "NHE BOT",
      testResults: testResults,
      buttonAPI: {},
      uiAPI: {},
      flowPresets: {}
    }

    // Backup semua function handler dari button (source code asli)
    if (button) {
      Object.keys(button).forEach(key => {
        if (typeof button[key] === "function") {
          backup.buttonAPI[key] = button[key].toString()
        } else if (key === "flow" && typeof button.flow === "object") {
          backup.flowPresets = {}
          Object.keys(button.flow).forEach(fkey => {
            if (typeof button.flow[fkey] === "function") {
              backup.flowPresets[fkey] = button.flow[fkey].toString()
            }
          })
        }
      })
    }

    // Backup UI handlers (source code)
    if (ui) {
      Object.keys(ui).forEach(key => {
        if (typeof ui[key] === "function") {
          backup.uiAPI[key] = ui[key].toString()
        }
      })
    }

    // Simpan ke folder backup
    const backupDir = "./backup"
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    const backupPath = `\( {backupDir}/button-test-full-backup- \){Date.now()}.json`
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2))

    console.log(`✅ AUTO BACKUP BERHASIL → ${backupPath}`)
    console.log(`   • ${Object.keys(backup.buttonAPI).length} button functions`)
    console.log(`   • ${Object.keys(backup.flowPresets).length} flow presets`)
    console.log(`   • ${Object.keys(backup.uiAPI).length} ui handlers`)
    console.log(`   • ${testResults.length} test results`)

    // Kirim notifikasi ke user
    await conn.sendMessage(m.chat, {
      text: `✅ BACKUP OTOMATIS SELESAI\nFile: ${backupPath}\nTotal handler: ${Object.keys(backup.buttonAPI).length + Object.keys(backup.flowPresets).length}`
    }, { quoted: q('fkontak') })
  }

  // ===== START =====
  await conn.sendMessage(m.chat, {
    text: "🧪 START ULTRA TEST SYSTEM v2.0 (Modern Interactive Button)"
  }, { quoted: q('fkontak') })

  // =========================
  // 🔹 UI ENGINE (tetap sama)
  // =========================
  await safe("sendUI()", async () => { await sendUI("🚀 UI Engine aktif") })
  await safe("ui.system()", async () => { await ui.system("System Notification OK") })
  await safe("ui.alert()", async () => { await ui.alert("Warning system") })
  await safe("ui.ai()", async () => { await ui.ai("AI Mode Active") })
  await safe("ui.forwarded()", async () => { await ui.forwarded("Forwarded simulation") })
  await safe("ui.broadcast()", async () => { await ui.broadcast("Broadcast simulation") })
  await safe("ui.random()", async () => { await ui.random("Random UI Mode") })
  await safe("ui.panel()", async () => { await ui.panel("🔥 DASHBOARD TEST") })

  // =========================
  // 🔹 FAKE QUOTED (tetap sama)
  // =========================
  await safe("fakeQuoted.fkontak", async () => {
    await conn.sendMessage(m.chat, { text: "fkontak" }, { quoted: q('fkontak') })
  })
  await safe("fakeQuoted.fgif", async () => {
    await conn.sendMessage(m.chat, { text: "fgif" }, { quoted: q('fgif') })
  })
  await safe("fakeQuoted.random()", async () => {
    await conn.sendMessage(m.chat, { text: "random fq" }, {
      quoted: Obj.fakeQuoted().random()
    })
  })

  // =========================
  // 🔹 BUTTON BASIC (UPDATED ke format itsukichan modern)
  // =========================
  await safe("button.flow.menu()", async () => {
    await button.sendInteractive("🧠 Menu Button Test (Single Select)", button.flow.menu())
  })
  await safe("button.sendInteractive() + quickReply", async () => {
    await button.sendInteractive("Tampilan menu", [
      ...button.flow.quickReply("📋 menu", ".menu"),
      ...button.flow.quickReply("🔍 owner", ".owner")
    ])
  })

  

  // =========================
  // 🔹 ADVANCED FLOW BUTTON (FULL MODERN + KOMBINASI)
  // =========================
  await safe("button.flow.fullMenu() + hybrid", async () => {
    await button.sendInteractive(
      "🔥 FULL INTERACTIVE MENU (NEW)",
      [
        ...button.flow.quickReply("📌 Buka Semua", ".allmenu"),
        ...button.flow.fullMenu(),
        ...button.flow.hybridMenu(global.botname || "NHE BOT")
      ]
    )
  })

  await safe("button.flow.hybridMenu() (super interactive)", async () => {
    await button.sendInteractive(
      "🚀 HYBRID BUTTON TEST\nQuick + List + Link + Call",
      button.flow.hybridMenu(global.botname || "NHE BOT")
    )
  })

  // =========================
  // 🔹 BUTTON PANEL (ADVANCE) - pakai hybrid
  // =========================
  await safe("button.panel() → hybrid advanced", async () => {
    await button.sendInteractive("🔥 ADVANCED PANEL BUTTON", button.flow.hybridMenu("NHE PANEL"))
  })

  // =========================
  // 🔹 NEW BUTTON TYPES (cta_url & cta_call)
  // =========================
  await safe("button.flow.ctaUrl()", async () => {
    await button.sendInteractive("🌐 Link Button Test", [
      ...button.flow.ctaUrl("Buka Website", "https://wa.me/62881027174423"),
      ...button.flow.quickReply("Kembali", ".menu")
    ])
  })

  await safe("button.flow.ctaCall()", async () => {
    await button.sendInteractive("📞 Call Button Test", [
      ...button.flow.ctaCall("Hubungi Owner", "62881027174423"),
      ...button.flow.quickReply("Cancel", ".cancel")
    ])
  })

  // =========================
  // 🔹 VALIDATION TEST (updated untuk API baru)
  // =========================
  await safe("button validation (modern API)", async () => {
    if (!button) throw new Error("buttonHelper tidak terinject")
    if (typeof button.sendInteractive !== "function") throw new Error("button.sendInteractive tidak ada")
    if (typeof button.sendFlow !== "function") throw new Error("button.sendFlow tidak ada")
    if (!button.flow) throw new Error("button.flow tidak ada")
    if (typeof button.flow.quickReply !== "function") throw new Error("flow.quickReply tidak ada")
    if (typeof button.flow.singleSelect !== "function") throw new Error("flow.singleSelect tidak ada")
    if (typeof button.flow.hybridMenu !== "function") throw new Error("flow.hybridMenu tidak ada")
    console.log("✅ Semua method modern tersedia")
  })

  // =========================
  // 🔹 FORCED ERROR (tetap untuk testing error handler)
  // =========================
  await safe("forced error", async () => {
    throw new Error("Simulasi error manual")
  })

  // =========================
  // 🔹 AUTO BACKUP + FINAL
  // =========================
  await backupHandlers()

  await conn.sendMessage(m.chat, {
    text: "✅ SEMUA TEST SELESAI\n" +
          "📦 Backup otomatis telah disimpan (source code + hasil test)\n" +
          "Cek folder ./backup dan console untuk detail lengkap"
  }, { quoted: q('fkontak') })
}

module.exports.command = ["testest", "testfull", "debugui", "testbutton"]