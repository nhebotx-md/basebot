const fs = require('fs')

global.owner = ['62881027174423'] 
global.namaown = "TangxAja"
global.prefa = ['','!','.',',','🐤','🗿'] // Prefix // Not Change
global.thumbnail = "https://lunara.drizznesiasite.biz.id/f/ApAdiHpYChQf.jpg"

global.welcome = true
global.goodbye = true

// fallback avatar kalau user tidak punya PP
global.thumb = "https://files.catbox.moe/3l75pp"

global.mess = {
  owner: "Maaf hanya untuk owner bot",
  prem: "Maaf hanya untuk pengguna premium",
  admin: "Maaf hanya untuk admin group",
  botadmin: "Maaf bot harus dijadikan admin",
  group: "Maaf hanya dapat digunakan di dalam group",
  private: "Silahkan gunakan fitur di private chat",
}

let file = require.resolve(__filename)
require('fs').watchFile(file, () => {
  require('fs').unwatchFile(file)
  console.log('\x1b[0;32m'+__filename+' \x1b[1;32mupdated!\x1b[0m')
  delete require.cache[file]
  require(file)
})
