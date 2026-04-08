// Plugins/pluginManager.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginDir = path.join(__dirname);

export default async function pluginManager(m, { args, reply, quoted }) {
  const sub = args[0]?.toLowerCase();

  if (!sub) return reply("Usage:\n.plugin + <namaFile.mjs> (reply kode)\n.plugin - <nomor>\n.plugin ? <nomor>\n.plugin list");

  // Ambil daftar plugin (kecuali manager sendiri)
  const files = fs.readdirSync(pluginDir).filter(f => f.endsWith(".mjs") && f !== "pluginManager.mjs");

  switch(sub) {

    // ================= ADD PLUGIN =================
    case "+":
      if (!quoted || !quoted.text) return reply("❌ Reply ke pesan yang berisi kode plugin!");
      if (!args[1]) return reply("❌ Harus menyertakan nama file. Contoh: .plugin + hello.mjs");
      let newPluginName = args[1];
      if (!newPluginName.endsWith(".mjs")) newPluginName += ".mjs";
      const addPath = path.join(pluginDir, newPluginName);
      if (fs.existsSync(addPath)) return reply("❌ Plugin sudah ada!");
      fs.writeFileSync(addPath, quoted.text);
      reply(`✅ Plugin '${newPluginName}' berhasil dibuat!`);
      break;

    // ================= DELETE PLUGIN =================
    case "-":
      if (!args[1]) return reply("Usage: .plugin - <nomor>");
      const delIndex = parseInt(args[1], 10) - 1;
      if (isNaN(delIndex) || delIndex < 0 || delIndex >= files.length) return reply("❌ Nomor plugin tidak valid!");
      const delPath = path.join(pluginDir, files[delIndex]);
      fs.unlinkSync(delPath);
      reply(`✅ Plugin '${files[delIndex]}' berhasil dihapus!`);
      break;

    // ================= GET PLUGIN =================
    case "?":
      if (!args[1]) return reply("Usage: .plugin ? <nomor>");
      const getIndex = parseInt(args[1], 10) - 1;
      if (isNaN(getIndex) || getIndex < 0 || getIndex >= files.length) return reply("❌ Nomor plugin tidak valid!");
      const getPath = path.join(pluginDir, files[getIndex]);
      const content = fs.readFileSync(getPath, "utf-8");
      reply(`📄 Isi plugin '${files[getIndex]}':\n\n${content}`);
      break;

    // ================= LIST PLUGIN =================
    case "list":
      if (files.length === 0) return reply("❌ Tidak ada plugin!");
      let listText = "📜 Daftar plugin:\n";
      files.forEach((f, i) => listText += `${i + 1}. ${f}\n`);
      reply(listText);
      break;

    default:
      reply("Unknown action. Usage:\n.plugin + <namaFile.mjs> (reply kode)\n.plugin - <nomor>\n.plugin ? <nomor>\n.plugin list");
  }
}

// Command array
pluginManager.command = ["plugin"];
pluginManager.owner = true