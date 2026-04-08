# 📚 BASEBOT MD - Dokumentasi Lengkap

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&color=gradient&customColorList=6,11,20&height=100&section=header&text=DOKUMENTASI&fontSize=36&fontColor=fff"/>
</p>

---

## 📋 Daftar Isi

1. [Getting Started](#-getting-started)
2. [Instalasi](#-instalasi)
   - [Termux](#termux)
   - [Windows](#windows)
   - [Linux/VPS](#linuxvps)
   - [Replit](#replit)
3. [Konfigurasi](#-konfigurasi)
4. [Struktur Folder](#-struktur-folder)
5. [Plugin Development](#-plugin-development)
   - [Plugin CJS](#plugin-cjs)
   - [Plugin ESM](#plugin-esm)
6. [API Reference](#-api-reference)
7. [Fitur](#-fitur)
8. [Troubleshooting](#-troubleshooting)
9. [FAQ](#-faq)
10. [Changelog](#-changelog)

---

## 🚀 Getting Started

### Persyaratan Sistem

| Platform | Minimum | Rekomendasi |
|----------|---------|-------------|
| Android (Termux) | RAM 2GB, Android 7.0 | RAM 4GB, Android 10+ |
| Windows | Windows 10, RAM 4GB | Windows 11, RAM 8GB |
| Linux/VPS | Ubuntu 18.04, RAM 2GB | Ubuntu 22.04, RAM 4GB |

### Dependencies

- Node.js 18.x atau lebih tinggi
- FFmpeg
- LibWebP
- Git

---

## 📦 Instalasi

### Termux

#### Langkah 1: Install Termux
Download Termux dari [F-Droid](https://f-droid.org/packages/com.termux/) (bukan dari Play Store)

#### Langkah 2: Setup Environment
```bash
# Update packages
pkg update && pkg upgrade -y

# Install dependencies
pkg install git nodejs ffmpeg libwebp python -y

# Verifikasi instalasi
node -v  # Harus v18.x atau lebih tinggi
npm -v
```

#### Langkah 3: Install Bot
```bash
# Clone repository
git clone https://github.com/nhebotx-md/basebot.git

# Masuk ke folder
cd basebot

# Install dependencies
npm install

# Jika error, coba:
npm install --force
# atau
npm install --legacy-peer-deps
```

#### Langkah 4: Konfigurasi
```bash
# Edit config.js
nano config.js

# Ubah:
global.owner = ['628XXXXXXXXXX']  # Ganti dengan nomor Anda
global.namaown = "Nama Anda"
```

#### Langkah 5: Jalankan Bot
```bash
# Mode normal
npm start

# Mode dengan auto-restart (jika ada error)
while true; do npm start; sleep 5; done
```

---

### Windows

#### Langkah 1: Install Software
1. Download [Node.js](https://nodejs.org/) (versi LTS)
2. Download [Git](https://git-scm.com/download/win)
3. Download [FFmpeg](https://ffmpeg.org/download.html)

#### Langkah 2: Setup FFmpeg
```powershell
# Extract FFmpeg ke C:\ffmpeg
# Tambahkan ke PATH Environment Variable
# C:\ffmpeg\bin

# Verifikasi
ffmpeg -version
```

#### Langkah 3: Install Bot
```powershell
# Buka PowerShell/Command Prompt
# Clone repository
git clone https://github.com/nhebotx-md/basebot.git

# Masuk ke folder
cd basebot

# Install dependencies
npm install
```

#### Langkah 4: Jalankan Bot
```powershell
npm start
```

---

### Linux/VPS

#### Langkah 1: Update System
```bash
sudo apt update && sudo apt upgrade -y
```

#### Langkah 2: Install Node.js
```bash
# Menggunakan NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verifikasi
node -v
npm -v
```

#### Langkah 3: Install Dependencies
```bash
sudo apt install -y git ffmpeg libwebp-dev build-essential
```

#### Langkah 4: Install Bot
```bash
git clone https://github.com/nhebotx-md/basebot.git
cd basebot
npm install
```

#### Langkah 5: Setup PM2 (Production)
```bash
# Install PM2 globally
sudo npm install -g pm2

# Start bot dengan PM2
pm2 start main.js --name "basebot"

# Save PM2 config
pm2 save
pm2 startup

# Commands
pm2 status          # Cek status
pm2 logs basebot    # Lihat logs
pm2 restart basebot # Restart bot
pm2 stop basebot    # Stop bot
```

---

### Replit

#### Langkah 1: Import Repository
1. Buka [Replit](https://replit.com/)
2. Klik "Create" → "Import from GitHub"
3. Masukkan URL: `https://github.com/nhebotx-md/basebot`

#### Langkah 2: Configure
```bash
# Di shell Replit
npm install
```

#### Langkah 3: Run
Klik tombol "Run" atau ketik:
```bash
npm start
```

---

## ⚙️ Konfigurasi

### File `config.js`

```javascript
const fs = require('fs')

// ==================== OWNER CONFIG ====================
global.owner = ['62881027174423']     // Nomor owner (tanpa + dan spasi)
global.namaown = "TangxAja"            // Nama owner
global.thumbnail = "https://url-gambar.jpg"  // Thumbnail default

// ==================== PREFIX CONFIG ====================
global.prefa = ['','!','.',',','🐤','🗿']  // Prefix commands
// '' = no prefix
// '!' = !command
// '.' = .command
// dll

// ==================== FEATURE CONFIG ====================
global.welcome = true    // Aktifkan pesan welcome
global.goodbye = true    // Aktifkan pesan goodbye

// ==================== FALLBACK CONFIG ====================
global.thumb = "https://files.catbox.moe/3l75pp"  // Fallback avatar

// ==================== MESSAGE CONFIG ====================
global.mess = {
  owner: "Maaf hanya untuk owner bot",
  prem: "Maaf hanya untuk pengguna premium",
  admin: "Maaf hanya untuk admin group",
  botadmin: "Maaf bot harus dijadikan admin",
  group: "Maaf hanya dapat digunakan di dalam group",
  private: "Silahkan gunakan fitur di private chat",
}

// ==================== AUTO UPDATE ====================
let file = require.resolve(__filename)
require('fs').watchFile(file, () => {
  require('fs').unwatchFile(file)
  console.log('\x1b[0;32m'+__filename+' \x1b[1;32mupdated!\x1b[0m')
  delete require.cache[file]
  require(file)
})
```

### Environment Variables (.env)

```bash
# Buat file .env
NODE_ENV=production
OWNER_NUMBER=62881027174423
BOT_NAME=BASEBOT
PREFIX=!,.,
```

---

## 📁 Struktur Folder

```
basebot/
│
├── 📂 Library/              # Library & utilities
│   ├── handle.mjs          # Handler untuk plugin ESM
│   ├── handler.js          # Handler untuk plugin CJS
│   ├── myfunction.js       # Fungsi-fungsi helper
│   ├── participants.js     # Manajemen peserta grup
│   ├── savetube.js         # YouTube downloader engine
│   ├── system.js           # Case system manager
│   └── uploader.js         # File uploader (Catbox, TelegraPh, dll)
│
├── 📂 Plugins-CJS/         # Plugin CommonJS
│   ├── plugin-add.js       # Command: .pluginadd
│   ├── plugin-del.js       # Command: .plugindel
│   ├── plugin-get.js       # Command: .pluginget
│   └── plugin-list.js      # Command: .pluginlist
│
├── 📂 Plugins-ESM/         # Plugin ES Module
│   ├── _pluginmanager.mjs  # Plugin manager system
│   ├── download-ytmp3.mjs  # Command: .ytmp3
│   ├── owner-backup.mjs    # Command: .backup
│   ├── search-pinterest.mjs # Command: .pinterest
│   └── search-spotifyplay.mjs # Command: .spotify
│
├── 📂 System/              # Core system files
│   └── message.js          # Message utilities & parser
│
├── 📂 data/                # Data storage
│   ├── owner.json          # Data owner
│   └── premium.json        # Data pengguna premium
│
├── 📂 session/             # WhatsApp session (auto-generated)
│
├── 📄 WhosTANG.js          # Main case handler
├── 📄 config.js            # Configuration file
├── 📄 main.js              # Entry point
├── 📄 package.json         # Dependencies
└── 📄 .gitignore           # Git ignore rules
```

---

## 🔌 Plugin Development

### Plugin CJS (CommonJS)

#### Struktur Dasar
```javascript
// Plugins-CJS/nama-plugin.js

module.exports = {
  name: 'namaPlugin',
  command: ['command1', 'command2', 'alias'],
  category: 'kategori',
  description: 'Deskripsi plugin',
  async execute(sock, m, args, text, usedPrefix, command) {
    // Kode plugin di sini
    await sock.sendMessage(m.chat, { 
      text: 'Hello World!' 
    }, { quoted: m })
  }
}
```

#### Contoh Plugin CJS
```javascript
// Plugins-CJS/echo.js

module.exports = {
  name: 'echo',
  command: ['echo', 'say'],
  category: 'fun',
  description: 'Mengulang pesan yang dikirim',
  async execute(sock, m, args, text, usedPrefix, command) {
    if (!text) {
      return m.reply(`Contoh: ${usedPrefix + command} Hello World`)
    }
    
    await sock.sendMessage(m.chat, { 
      text: `📢 *Echo:*\n\n${text}` 
    }, { quoted: m })
  }
}
```

#### Parameter yang Tersedia

| Parameter | Type | Description |
|-----------|------|-------------|
| `sock` | Object | WhatsApp socket connection |
| `m` | Object | Message object |
| `args` | Array | Arguments array |
| `text` | String | Full text after command |
| `usedPrefix` | String | Prefix yang digunakan |
| `command` | String | Command yang dipanggil |

---

### Plugin ESM (ES Module)

#### Struktur Dasar
```javascript
// Plugins-ESM/nama-plugin.mjs

async function handler(m, { sock, text, usedPrefix, command }) {
  // Kode plugin di sini
  await sock.sendMessage(m.chat, { 
    text: 'Hello World!' 
  }, { quoted: m })
}

handler.help = ['command <args>']
handler.tags = ['kategori']
handler.command = /^(command|alias)$/i

export default handler
```

#### Contoh Plugin ESM
```javascript
// Plugins-ESM/sticker.mjs

import { writeFileSync, unlinkSync } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

async function handler(m, { sock }) {
  const quoted = m.quoted || m
  const mime = (quoted.msg || quoted).mimetype || ''
  
  if (!/image|video/.test(mime)) {
    return m.reply('Reply gambar/video dengan caption .sticker')
  }
  
  m.reply('⏳ Membuat sticker...')
  
  const buffer = await quoted.download()
  const inputPath = `/tmp/${Date.now()}.input`
  const outputPath = `/tmp/${Date.now()}.webp`
  
  writeFileSync(inputPath, buffer)
  
  await execPromise(`ffmpeg -i ${inputPath} -vf "scale=512:512:force_original_aspect_ratio=decrease" ${outputPath}`)
  
  await sock.sendMessage(m.chat, {
    sticker: { url: outputPath }
  }, { quoted: m })
  
  unlinkSync(inputPath)
  unlinkSync(outputPath)
}

handler.help = ['sticker']
handler.tags = ['converter']
handler.command = /^(sticker|s|stiker)$/i

export default handler
```

#### Object Handler Properties

| Property | Type | Description |
|----------|------|-------------|
| `handler.help` | Array | Help text untuk command |
| `handler.tags` | Array/String | Kategori plugin |
| `handler.command` | RegExp | Pattern command |
| `handler.owner` | Boolean | Hanya untuk owner |
| `handler.premium` | Boolean | Hanya untuk premium |
| `handler.group` | Boolean | Hanya di grup |
| `handler.admin` | Boolean | Hanya untuk admin |
| `handler.botAdmin` | Boolean | Bot harus admin |

---

## 📚 API Reference

### Message Object (m)

```javascript
// Properties umum
m.chat          // ID chat
m.sender        // ID pengirim
m.fromMe        // Apakah dari bot
m.isGroup       // Apakah di grup
m.text          // Teks pesan
m.quoted        // Pesan yang direply

// Methods
m.reply(text)   // Reply pesan
m.react(emoji)  // React dengan emoji

// Contoh penggunaan
if (m.isGroup) {
  await m.reply('Ini grup!')
}
```

### Socket Object (sock)

```javascript
// Mengirim pesan
await sock.sendMessage(jid, { text: 'Hello' })

// Mengirim gambar
await sock.sendMessage(jid, { 
  image: { url: 'path/to/image.jpg' },
  caption: 'Caption gambar'
})

// Mengirim video
await sock.sendMessage(jid, {
  video: { url: 'path/to/video.mp4' },
  caption: 'Caption video'
})

// Mengirim audio
await sock.sendMessage(jid, {
  audio: { url: 'path/to/audio.mp3' },
  mimetype: 'audio/mpeg'
})

// Mengirim sticker
await sock.sendMessage(jid, {
  sticker: { url: 'path/to/sticker.webp' }
})

// Mengirim dengan button
await sock.sendMessage(jid, {
  text: 'Pilih opsi:',
  buttons: [
    { buttonId: 'id1', buttonText: { displayText: 'Opsi 1' } },
    { buttonId: 'id2', buttonText: { displayText: 'Opsi 2' } }
  ],
  headerType: 1
})

// Mengirim template message
await sock.sendMessage(jid, {
  text: 'Pilih menu:',
  templateButtons: [
    { index: 1, urlButton: { displayText: 'Visit', url: 'https://example.com' } },
    { index: 2, callButton: { displayText: 'Call', phoneNumber: '+1234567890' } },
    { index: 3, quickReplyButton: { displayText: 'Reply', id: 'id' } }
  ]
})
```

### Group Methods

```javascript
// Get group metadata
const metadata = await sock.groupMetadata(jid)

// Get participants
const participants = metadata.participants

// Add participant
await sock.groupParticipantsUpdate(jid, ['number@s.whatsapp.net'], 'add')

// Remove participant
await sock.groupParticipantsUpdate(jid, ['number@s.whatsapp.net'], 'remove')

// Promote to admin
await sock.groupParticipantsUpdate(jid, ['number@s.whatsapp.net'], 'promote')

// Demote from admin
await sock.groupParticipantsUpdate(jid, ['number@s.whatsapp.net'], 'demote')

// Update group subject
await sock.groupUpdateSubject(jid, 'New Subject')

// Update group description
await sock.groupUpdateDescription(jid, 'New Description')

// Leave group
await sock.groupLeave(jid)
```

### Utility Functions (dari System/message.js)

```javascript
const { 
  smsg,           // Serialize message
  tanggal,        // Get formatted date
  getTime,        // Get time
  isUrl,          // Check if string is URL
  sleep,          // Delay execution
  clockString,    // Format milliseconds to time
  runtime,        // Get bot uptime
  fetchJson,      // Fetch JSON from URL
  getBuffer,      // Get buffer from URL
  jsonformat,     // Format JSON
  format,         // Format number
  parseMention,   // Parse mentions from text
  getRandom,      // Get random item from array
  getGroupAdm,    // Get group admins
  generateProfilePicture  // Generate profile picture
} = require('./System/message')
```

---

## 🎯 Fitur

### Core Features

#### 1. Pairing Code Login
```javascript
// main.js
const usePairingCode = true  // Aktifkan pairing code

// Saat pertama kali login, masukkan nomor
// Bot akan memberikan kode pairing
// Masukkan kode di WhatsApp > Linked Devices
```

#### 2. Auto Restart
```javascript
// Bot otomatis restart jika terjadi error
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
})
```

#### 3. Anti Call
```javascript
// Otomatis menolak panggilan
WhosTANG.ev.on('call', async (caller) => {
  console.log("📞 Panggilan masuk dari:", caller)
  // Bot akan mengabaikan panggilan
})
```

#### 4. Welcome/Goodbye
```javascript
// config.js
global.welcome = true  // Aktifkan
global.goodbye = true  // Aktifkan

// Custom message
global.welcomeMessage = (name, group, count) => {
  return `👋 Selamat datang *${name}* di *${group}*!\n\nKamu adalah member ke-${count}`
}
```

### Plugin Features

#### YouTube Downloader (ytmp3)
```
Command: .ytmp3 <url>
Example: .ytmp3 https://youtu.be/dQw4w9WgXcQ
```

#### Pinterest Search
```
Command: .pinterest <query>
Example: .pinterest anime wallpaper
```

#### Spotify Search
```
Command: .spotify <query>
Example: .spotify naruto opening
```

#### Backup System
```
Command: .backup
Description: Backup session dan data ke file zip
```

---

## 🔧 Troubleshooting

### Error Umum

#### 1. `Cannot find module`
**Penyebab:** Dependencies belum terinstall

**Solusi:**
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### 2. `Session expired` atau `Unauthorized`
**Penyebab:** Session sudah tidak valid

**Solusi:**
```bash
rm -rf session
npm start
```

#### 3. `FFmpeg not found`
**Penyebab:** FFmpeg belum terinstall

**Solusi Termux:**
```bash
pkg install ffmpeg
```

**Solusi Windows:**
- Download FFmpeg dari https://ffmpeg.org/download.html
- Extract ke `C:\ffmpeg`
- Tambahkan `C:\ffmpeg\bin` ke PATH

#### 4. `Cannot read property 'X' of undefined`
**Penyebab:** Message tidak ter-parse dengan benar

**Solusi:**
- Pastikan menggunakan `smsg()` untuk serialize message
- Check apakah property ada sebelum mengakses

#### 5. `Connection Closed`
**Penyebab:** Koneksi terputus

**Solusi:**
```javascript
// Bot akan otomatis reconnect
// Jika tidak, restart manual:
npm start
```

#### 6. Error di Termux: `Killed`
**Penyebab:** Memory tidak cukup

**Solusi:**
```bash
# Bersihkan memory
pkg install proot-distro
proot-distro install debian
proot-distro login debian

# Atau gunakan swap
pkg install swap
swapon /data/swapfile
```

---

## ❓ FAQ

### Q: Bagaimana cara mengubah nomor owner?
**A:** Edit file `config.js`:
```javascript
global.owner = ['628XXXXXXXXXX']
```

### Q: Bagaimana cara menambahkan prefix?
**A:** Edit file `config.js`:
```javascript
global.prefa = ['','!','.','#','$']
```

### Q: Bagaimana cara menonaktifkan welcome message?
**A:** Edit file `config.js`:
```javascript
global.welcome = false
global.goodbye = false
```

### Q: Bot tidak merespon command?
**A:** 
1. Check apakah prefix benar
2. Check logs untuk error
3. Pastikan bot sudah terhubung (cek terminal)

### Q: Bagaimana cara update bot?
**A:**
```bash
git pull origin main
npm install
```

### Q: Apakah support multi-device?
**A:** Ya, bot menggunakan Baileys MD (Multi-Device)

### Q: Bagaimana cara deploy ke Heroku?
**A:** 
1. Fork repository
2. Connect ke Heroku
3. Set buildpack: `heroku/nodejs`
4. Deploy

### Q: Bagaimana cara backup session?
**A:** Gunakan command `.backup` atau copy folder `session` secara manual

---

## 📝 Changelog

### v1.2 (Latest)
- ✅ Update otomatis system
- ✅ Perbaikan pairing code
- ✅ Optimasi performa
- ✅ Tambah plugin Spotify

### v1.1
- ✅ Support ESM plugins
- ✅ Plugin manager
- ✅ Backup system
- ✅ YouTube downloader

### v1.0
- ✅ Initial release
- ✅ Base system
- ✅ CJS plugins
- ✅ Welcome/goodbye

---

## 📞 Support

Jika ada pertanyaan atau masalah, silakan:

- 🐛 [Buat Issue](https://github.com/nhebotx-md/basebot/issues)
- 💬 [WhatsApp](https://wa.me/62881027174423)
- 📧 Email: contact@basebot.my.id

---

<p align="center">
  <b>Dokumentasi ini akan terus diupdate sesuai perkembangan bot.</b><br>
  <b>Terakhir update: 6 April 2026</b>
</p>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=100&section=footer"/>
</p>
