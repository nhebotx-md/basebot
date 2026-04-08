const fs = require("fs")

let handler = async (m, { isOwn, reply, text }) => {
if (!isOwn) return reply("hanya untuk owner")
if (!text) return m.reply("namafile plugins nya")
if (!text.endsWith(".js")) return m.reply("Nama file harus berformat .js")
if (!fs.existsSync("./Plugins-CJS/" + text.toLowerCase())) return m.reply("File plugins tidak ditemukan!")
let res = await fs.readFileSync("./Plugins-CJS/" + text.toLowerCase())
return m.reply(`${res.toString()}`)
}

handler.command = ["getp", "gp", "getplugins", "getplugin"]

module.exports = handler