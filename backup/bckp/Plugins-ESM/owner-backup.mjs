/**
 *» Nama : Backup Script Bot (Clean)
 *» Type : Plugin ESM
 *» Creator : Kyzo Dev
 */

import fs from "fs"
import path from "path"
import archiver from "archiver"

async function handler(m, { conn }) {
  try {
    let botJid = conn.user.id.split(":")[0] + "@s.whatsapp.net"
    let date = new Date().toISOString().replace(/[:.]/g, "-")
    let fileName = `backup-bot-${date}.zip`
    let filePath = path.join(process.cwd(), fileName)

    m.reply("📦 Membuat backup script (tanpa node_modules)...")

    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(filePath)
      const archive = archiver("zip", { zlib: { level: 9 } })

      output.on("close", resolve)
      archive.on("error", reject)

      archive.pipe(output)

      // EXCLUDE node_modules & package-lock
      archive.glob("**/*", {
        cwd: process.cwd(),
        ignore: [
          "node_modules/**",
          "package-lock.json",
          "backup-bot-*.zip"
        ]
      })

      archive.finalize()
    })

    await conn.sendMessage(botJid, {
      document: fs.readFileSync(filePath),
      fileName,
      mimetype: "application/zip",
      caption: "✅ Backup script bot (clean)"
    })

    fs.unlinkSync(filePath)

    m.reply("✅ Backup berhasil dikirim ke nomor bot!")

  } catch (e) {
    console.error(e)
    m.reply("❌ Backup gagal!")
  }
}

handler.help = ["backup", "bckup", "bc"]
handler.tags = ["owner"]
handler.command = /^(backup|bckup|bc)$/i
handler.owner = true

export default handler