<div align="center">

<!-- HERO SECTION -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=200&section=header&text=BASEBOT%20MD&fontSize=60&fontColor=fff&animation=fadeIn&fontAlignY=35" width="100%">

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.2.0-00D9FF?style=for-the-badge&logo=semver&logoColor=white" alt="Version">
  <img src="https://img.shields.io/badge/License-MIT-00FF88?style=for-the-badge&logo=opensource&logoColor=white" alt="License">
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Baileys-@itsukichan-FF6B6B?style=for-the-badge&logo=whatsapp&logoColor=white" alt="Baileys">
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/nhebotx-md/basebot?color=FFD700&style=for-the-badge&logo=github&logoColor=white" alt="Stars">
  <img src="https://img.shields.io/github/forks/nhebotx-md/basebot?color=00CCFF&style=for-the-badge&logo=github&logoColor=white" alt="Forks">
  <img src="https://img.shields.io/github/issues/nhebotx-md/basebot?color=FF6B6B&style=for-the-badge&logo=github&logoColor=white" alt="Issues">
  <img src="https://img.shields.io/github/last-commit/nhebotx-md/basebot?color=00FF88&style=for-the-badge&logo=git&logoColor=white" alt="Last Commit">
</p>

<h3 align="center">
  <samp>Enterprise-Grade WhatsApp Bot Framework with Dual Plugin Architecture</samp>
</h3>

<p align="center">
  <samp>Built for scalability. Designed for developers. Powered by Baileys.</samp>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-documentation">Docs</a> •
  <a href="#-contributing">Contribute</a>
</p>

</div>

---

## ✨ Overview

**BaseBot MD** is a modern, enterprise-ready WhatsApp bot framework built on top of [@itsukichan/baileys](https://github.com/itsukichan/baileys). Designed with a **dual plugin architecture** (CJS + ESM), it provides developers with maximum flexibility while maintaining clean code organization and scalability.

### 🎯 Key Highlights

| Aspect | Description |
|--------|-------------|
| **Architecture** | Modular dual-plugin system supporting both CommonJS and ES Modules |
| **Authentication** | Pairing Code login (no QR scanning required) |
| **Compatibility** | Full iOS & Android support with interactive button features |
| **Scalability** | Plugin-based extensibility for unlimited feature growth |
| **Reliability** | Auto-restart, auto-backup, and session persistence |

### 👥 Target Users

- 🤖 **Bot Developers** — Building custom WhatsApp automation solutions
- 🏢 **Business Owners** — Automating customer service and notifications  
- 👨‍💻 **Open Source Contributors** — Extending the framework with plugins
- 🎓 **Learners** — Studying modern Node.js bot architecture

---

## 🚀 Quick Start

Get your bot running in under 2 minutes:

```bash
# Clone the repository
git clone https://github.com/nhebotx-md/basebot.git
cd basebot

# Install dependencies
npm install

# Configure your bot (edit config.js)
cp config.example.js config.js

# Start the bot
npm start
```

> 💡 **First Run**: Enter your pairing code when prompted. No QR scanning needed!

---

## 📋 Table of Contents

- [✨ Overview](#-overview)
- [🚀 Quick Start](#-quick-start)
- [🎯 Features](#-features)
  - [🤖 AI System](#-ai-system)
  - [📥 Downloader](#-downloader)
  - [🛠️ Tools](#️-tools)
  - [🕌 Islamic Features](#-islamic-features)
  - [👥 Group Management](#-group-management)
  - [🎮 Game & Leveling](#-game--leveling)
  - [⚙️ Automation](#️-automation)
- [🏗️ Architecture](#️-architecture)
  - [System Flow](#system-flow)
  - [Plugin System](#plugin-system)
  - [Button System](#button-system)
  - [Database System](#database-system)
- [📁 Project Structure](#-project-structure)
- [⚙️ Installation](#️-installation)
  - [Termux (Android)](#termux-android)
  - [Windows](#windows)
  - [Linux/VPS](#linuxvps)
- [🔧 Configuration](#-configuration)
- [🔌 Plugin Development](#-plugin-development)
- [🧠 Case System](#-case-system)
- [🎮 Level & Rank System](#-level--rank-system)
- [🛡️ Error Handling](#️-error-handling)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)

---

## 🎯 Features

### 🤖 AI System

| Feature | Status | Description |
|---------|--------|-------------|
| `shoNhe AI` | ✅ | Intelligent conversational AI assistant |
| `Context Awareness` | ✅ | Maintains conversation context across messages |
| `Multi-language` | ✅ | Supports multiple languages automatically |

### 📥 Downloader

| Command | Status | Description |
|---------|--------|-------------|
| `.ytmp3 <url>` | ✅ | Download YouTube audio (MP3) |
| `.ytmp4 <url>` | ✅ | Download YouTube video (MP4) |
| `.tiktok <url>` | ✅ | Download TikTok videos |
| `.instagram <url>` | ✅ | Download Instagram media |
| `.facebook <url>` | ✅ | Download Facebook videos |

### 🛠️ Tools

| Feature | Status | Description |
|---------|--------|-------------|
| `Sticker Maker` | ✅ | Convert images/videos to WhatsApp stickers |
| `Image to Text (OCR)` | ✅ | Extract text from images |
| `QR Code Generator` | ✅ | Generate QR codes instantly |
| `Short URL` | ✅ | URL shortening service |
| `Base64 Encoder/Decoder` | ✅ | Encode/decode base64 strings |

### 🕌 Islamic Features

| Feature | Status | Description |
|---------|--------|-------------|
| `.jadwalsholat <kota>` | ✅ | Daily prayer schedule by city |
| `.alquran <surah>` | ✅ | Read Quran verses with translation |
| `.asmaulhusna` | ✅ | 99 Names of Allah |
| `.hadist <kitab>` | ✅ | Search hadith collections |
| `.kisahnabi` | ✅ | Stories of the Prophets |

### 👥 Group Management

| Feature | Status | Description |
|---------|--------|-------------|
| `Welcome Message` | ✅ | Auto welcome new members |
| `Goodbye Message` | ✅ | Auto farewell leaving members |
| `Anti Link` | ✅ | Block group link sharing |
| `Anti Spam` | ✅ | Automatic spam detection |
| `Group Settings` | ✅ | Open/close group, edit info |
| `Admin Tools` | ✅ | Promote/demote, kick, mute |

### 🎮 Game & Leveling

| Feature | Status | Description |
|---------|--------|-------------|
| `Rank System` | ✅ | 15+ rank levels from Bronze to Mythic |
| `EXP System` | ✅ | Gain EXP from chat activity |
| `Auto Role` | ✅ | Automatic rank promotion |
| `Leaderboard` | ✅ | Top users ranking |
| `Mini Games` | ✅ | Tic-tac-toe, tebak gambar, etc. |

### ⚙️ Automation

| Feature | Status | Description |
|---------|--------|-------------|
| `Auto Restart` | ✅ | Automatic restart on crash |
| `Auto Backup` | ✅ | Scheduled session & data backup |
| `Anti Call` | ✅ | Auto reject incoming calls |
| `Auto Read` | ✅ | Mark messages as read |
| `Online Presence` | ✅ | Maintain online status |

---

## 🏗️ Architecture

### System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        BASEBOT MD ARCHITECTURE                   │
└─────────────────────────────────────────────────────────────────┘

  ┌─────────────┐
  │ User Message │
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐     ┌─────────────────────────────────────┐
  │   Handler   │────▶│  • Message Parser                   │
  │  (handler)  │     │  • Prefix Detection                 │
  └──────┬──────┘     │  • Command Extraction               │
         │            └─────────────────────────────────────┘
         ▼
  ┌─────────────┐     ┌─────────────────────────────────────┐
  │   case.js   │────▶│  • Command Routing                  │
  │   (Router)  │     │  • Feature Mapping                  │
  └──────┬──────┘     │  • Permission Check                 │
         │            └─────────────────────────────────────┘
         ▼
  ┌─────────────┐     ┌─────────────────────────────────────┐
  │   Feature   │────▶│  • Plugin Execution                 │
  │   / Plugin  │     │  • API Integration                  │
  └──────┬──────┘     │  • Database Operations                │
         │            └─────────────────────────────────────┘
         ▼
  ┌─────────────┐
  │   Response  │
  └─────────────┘
```

### Plugin System

BaseBot implements a **dual-plugin architecture** supporting both CommonJS and ES Modules:

```
┌────────────────────────────────────────────────────────────┐
│                     PLUGIN SYSTEM                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────┐        ┌─────────────────┐           │
│  │  Plugins-CJS/   │        │  Plugins-ESM/   │           │
│  │  (CommonJS)     │        │  (ES Modules)   │           │
│  │                 │        │                 │           │
│  │  • plugin-add   │        │  • _pluginmanager│           │
│  │  • plugin-del   │        │  • download-*   │           │
│  │  • plugin-get   │        │  • search-*     │           │
│  │  • plugin-list  │        │  • owner-*      │           │
│  └────────┬────────┘        └────────┬────────┘           │
│           │                          │                    │
│           └──────────┬───────────────┘                    │
│                      │                                     │
│                      ▼                                     │
│           ┌─────────────────┐                             │
│           │  Plugin Loader  │                             │
│           │  (Dynamic Import│                             │
│           │   & Require)    │                             │
│           └─────────────────┘                             │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Button System

Interactive button support for enhanced user experience:

```javascript
// Button Message Structure
{
  text: "Choose an option:",
  footer: "BaseBot MD",
  buttons: [
    { buttonId: "opt1", buttonText: { displayText: "Option 1" } },
    { buttonId: "opt2", buttonText: { displayText: "Option 2" } }
  ],
  viewOnce: true
}
```

### Database System

Lightweight JSON-based database for zero-config setup:

```
┌─────────────────────────────────────────┐
│           DATABASE SYSTEM               │
├─────────────────────────────────────────┤
│                                         │
│  📁 data/                               │
│  ├── 📄 owner.json      # Owner data    │
│  ├── 📄 premium.json    # Premium users │
│  ├── 📄 users.json      # User profiles │
│  └── 📄 groups.json     # Group settings│
│                                         │
│  Features:                              │
│  • Auto-save on change                  │
│  • Atomic write operations              │
│  • Backup & restore support             │
│                                         │
└─────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
📦 basebot/
│
├── 📂 Library/                    # Core utilities & handlers
│   ├── 📄 handle.mjs             # ESM message handler
│   ├── 📄 handler.js             # CJS message handler  
│   ├── 📄 myfunction.js          # Helper functions collection
│   ├── 📄 participants.js        # Group participant manager
│   ├── 📄 savetube.js            # YouTube downloader engine
│   ├── 📄 system.js              # Case system manager
│   └── 📄 uploader.js            # File upload utilities
│
├── 📂 Plugins-CJS/               # CommonJS plugins
│   ├── 📄 plugin-add.js          # Add new plugin
│   ├── 📄 plugin-del.js          # Delete plugin
│   ├── 📄 plugin-get.js          # View plugin source
│   └── 📄 plugin-list.js         # List all plugins
│
├── 📂 Plugins-ESM/               # ES Module plugins
│   ├── 📄 _pluginmanager.mjs     # Plugin manager core
│   ├── 📄 download-ytmp3.mjs     # YouTube MP3 downloader
│   ├── 📄 owner-backup.mjs       # Backup system
│   ├── 📄 search-pinterest.mjs   # Pinterest search
│   └── 📄 search-spotifyplay.mjs # Spotify search
│
├── 📂 System/                    # Core system files
│   └── 📄 message.js             # Message utilities
│
├── 📂 data/                      # JSON database storage
│   ├── 📄 owner.json             # Owner configuration
│   └── 📄 premium.json           # Premium users list
│
├── 📂 session/                   # WhatsApp session (auto-generated)
│   └── (auth credentials)
│
├── 📄 WhosTANG.js                # Main case handler (router)
├── 📄 config.js                  # Bot configuration
├── 📄 main.js                    # Application entry point
├── 📄 package.json               # Dependencies & scripts
└── 📄 .gitignore                 # Git ignore rules
```

### File Descriptions

| File/Folder | Purpose |
|-------------|---------|
| `main.js` | Application entry point - initializes connection |
| `WhosTANG.js` | Core case handler - routes commands to features |
| `config.js` | Central configuration - owner, prefix, messages |
| `Library/handler.js` | Message preprocessing & command parsing |
| `Library/system.js` | Plugin loader & execution manager |

---

## ⚙️ Installation

### Requirements

- **Node.js** 18.x or higher
- **Git** for cloning
- **FFmpeg** for media processing
- **RAM** 2GB minimum (4GB recommended)

### Termux (Android)

> ⚠️ **Requirements**: Android 7.0+ | RAM 3GB+ | Storage 1GB+

```bash
# Update packages
pkg update && pkg upgrade -y

# Install dependencies
pkg install git nodejs ffmpeg libwebp -y

# Clone repository
git clone https://github.com/nhebotx-md/basebot.git
cd basebot

# Install npm packages
npm install

# Start bot
npm start
```

#### Common Termux Issues

<details>
<summary><b>❌ Cannot find module</b></summary>

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```
</details>

<details>
<summary><b>❌ Permission denied</b></summary>

```bash
# Grant execution permissions
chmod +x main.js
termux-setup-storage
```
</details>

<details>
<summary><b>❌ Session expired</b></summary>

```bash
# Delete old session and restart
rm -rf session
npm start
```
</details>

### Windows

> ⚠️ **Requirements**: Windows 10/11 | Node.js 18+ | Git

```powershell
# Install prerequisites:
# • Node.js: https://nodejs.org/
# • Git: https://git-scm.com/

# Clone and setup
git clone https://github.com/nhebotx-md/basebot.git
cd basebot
npm install
npm start
```

### Linux/VPS

> ⚠️ **Requirements**: Ubuntu 20.04+ | Node.js 18+ | 2GB RAM

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install dependencies
sudo apt install -y git ffmpeg libwebp-dev

# Clone and setup
git clone https://github.com/nhebotx-md/basebot.git
cd basebot
npm install

# Production deployment with PM2
sudo npm install -g pm2
pm2 start main.js --name "basebot"
pm2 save
pm2 startup
```

---

## 🔧 Configuration

Edit `config.js` to customize your bot:

```javascript
// ═══════════════════════════════════════════════════════════
// BASEBOT MD - CONFIGURATION FILE
// ═══════════════════════════════════════════════════════════

global.owner = ['62881027174423']           // Owner phone number(s)
global.namaown = "TangxAja"                  // Owner display name
global.namabot = "BaseBot MD"                // Bot name
global.packname = "BaseBot Sticker"          // Sticker pack name
global.author = "© TangxAja"                 // Sticker author

// Prefix configuration - multiple prefixes supported
global.prefa = ['', '!', '.', ',', '🐤', '🗿']

// Media & UI
global.thumbnail = "https://your-image.jpg"  // Bot thumbnail URL
global.watermark = "BaseBot MD"              // Watermark text

// Feature toggles
global.welcome = true                        // Enable welcome messages
global.goodbye = true                        // Enable goodbye messages
global.antilink = false                      // Enable anti-link
global.anticall = true                       // Enable anti-call

// Auto-read settings
global.autoread = true                       // Auto read messages
global.autoread_group = false                // Auto read group only
global.autotyping = true                     // Show typing indicator

// Response messages
global.mess = {
  owner: "⚠️ This feature is restricted to bot owner only.",
  prem: "⭐ This feature is for premium users only.",
  admin: "👑 This feature is for group admins only.",
  botadmin: "🤖 I need to be an admin to use this feature.",
  group: "👥 This feature can only be used in groups.",
  private: "📩 Please use this feature in private chat.",
  wait: "⏳ Please wait, processing your request...",
  error: "❌ An error occurred. Please try again later.",
  success: "✅ Operation completed successfully!",
  limit: "📊 You have reached your daily limit.",
  nsfw: "🔞 This feature is age-restricted."
}

// API Keys (add your own)
global.apikey = {
  openai: 'your-openai-key',
  youtube: 'your-youtube-api-key',
  // ... add more as needed
}
```

---

## 🔌 Plugin Development

### Creating a CJS Plugin

```javascript
// Plugins-CJS/hello.js
// ═══════════════════════════════════════════════════════════

module.exports = {
  name: 'hello',
  command: ['hello', 'hi', 'hey'],
  category: 'general',
  description: 'Send a greeting message',
  
  async execute(sock, m, args, quoted, sender, isOwner, isAdmin) {
    const greeting = `Hello, @${sender.split('@')[0]}! 👋`;
    
    await sock.sendMessage(m.chat, { 
      text: greeting,
      mentions: [sender]
    }, { 
      quoted: m 
    });
  }
};
```

### Creating an ESM Plugin

```javascript
// Plugins-ESM/hello.mjs
// ═══════════════════════════════════════════════════════════

/**
 * Handler function for the hello command
 * @param {Object} m - Message object
 * @param {Object} param1 - Destructured parameters
 */
async function handler(m, { sock, args, isOwner, isAdmin }) {
  const greeting = `Hello, @${m.sender.split('@')[0]}! 👋`;
  
  await sock.sendMessage(m.chat, { 
    text: greeting,
    mentions: [m.sender]
  }, { 
    quoted: m 
  });
}

// Plugin metadata
handler.help = ['hello', 'hi', 'hey'];
handler.tags = ['general'];
handler.command = /^(hello|hi|hey)$/i;
handler.owner = false;      // Not owner-only
handler.premium = false;    // Not premium-only
handler.group = false;      // Works in any chat
handler.private = false;    // Works in groups too

export default handler;
```

### Plugin Manager Commands

| Command | Description | Example |
|---------|-------------|---------|
| `.pluginadd <name>` | Add new plugin | `.pluginadd welcome` |
| `.plugindel <name>` | Delete plugin | `.plugindel welcome` |
| `.pluginget <name>` | View plugin source | `.pluginget welcome` |
| `.pluginlist` | List all plugins | `.pluginlist` |

---

## 🧠 Case System

The `case.js` (WhosTANG.js) file serves as the **central command router**:

```javascript
// ═══════════════════════════════════════════════════════════
// CASE SYSTEM FLOW
// ═══════════════════════════════════════════════════════════

// 1. Message received
// 2. Extract command and arguments
// 3. Match command to case
// 4. Execute corresponding handler
// 5. Send response

case 'ytmp3':
case 'ytaudio':
  // Validate input
  if (!args[0]) return reply('Please provide a YouTube URL');
  
  // Show processing indicator
  reply(global.mess.wait);
  
  try {
    // Execute download logic
    const result = await savetube.download(args[0], 'mp3');
    
    // Send result
    await sock.sendMessage(m.chat, {
      audio: { url: result.url },
      mimetype: 'audio/mp4',
      ptt: false
    }, { quoted: m });
    
  } catch (error) {
    // Error handling
    reply(`${global.mess.error}\n\n${error.message}`);
  }
  break;
```

### Case Structure

```
┌─────────────────────────────────────────────┐
│              CASE STRUCTURE                 │
├─────────────────────────────────────────────┤
│                                             │
│  case 'command':                            │
│    // 1. Input validation                   │
│    if (!condition) return reply('error');   │
│                                             │
│    // 2. Permission check                   │
│    if (!isOwner) return reply(mess.owner);  │
│                                             │
│    // 3. Processing indicator               │
│    reply(mess.wait);                        │
│                                             │
│    // 4. Execute feature logic              │
│    const result = await feature.execute();  │
│                                             │
│    // 5. Send response                      │
│    await sock.sendMessage(...);             │
│    break;                                   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🎮 Level & Rank System

### Rank Levels

| Level | Name | EXP Required | Badge |
|-------|------|--------------|-------|
| 1 | Bronze III | 0 | 🥉 |
| 2 | Bronze II | 500 | 🥉 |
| 3 | Bronze I | 1000 | 🥉 |
| 4 | Silver III | 2000 | 🥈 |
| 5 | Silver II | 3500 | 🥈 |
| 6 | Silver I | 5000 | 🥈 |
| 7 | Gold III | 7500 | 🥇 |
| 8 | Gold II | 10000 | 🥇 |
| 9 | Gold I | 15000 | 🥇 |
| 10 | Platinum III | 20000 | 💎 |
| 11 | Platinum II | 30000 | 💎 |
| 12 | Platinum I | 40000 | 💎 |
| 13 | Diamond | 50000 | 💠 |
| 14 | Master | 75000 | 👑 |
| 15 | Mythic | 100000 | 🔱 |

### EXP System

```javascript
// EXP Gain Formula
const expGain = {
  message: 1,           // +1 EXP per message
  command: 5,           // +5 EXP per command used
  gameWin: 25,          // +25 EXP for winning games
  daily: 100            // +100 EXP daily bonus
};

// Auto-rank promotion
if (user.exp >= nextLevel.requiredExp) {
  user.level++;
  user.rank = getRankByLevel(user.level);
  notifyUser(`🎉 Congratulations! You've been promoted to ${user.rank}!`);
}
```

---

## 🛡️ Error Handling

### Built-in Error Recovery

```javascript
// ═══════════════════════════════════════════════════════════
// ERROR HANDLING & LOGGING
// ═══════════════════════════════════════════════════════════

// Connection error handling
WhosTANG.ev.on('connection.update', async (update) => {
  const { connection, lastDisconnect } = update;
  
  if (connection === 'close') {
    const reason = lastDisconnect?.error?.output?.statusCode;
    
    // Auto-reconnect (except logged out)
    if (reason !== DisconnectReason.loggedOut) {
      console.log('🔄 Connection lost. Reconnecting...');
      connectToWhatsApp();
    } else {
      console.log('❌ Logged out. Please scan QR again.');
    }
  }
});

// Uncaught exception handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Log to file and continue
});

// Unhandled rejection handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
```

### Logging System

| Log Type | Description | Output |
|----------|-------------|--------|
| `console.log` | General info | Terminal |
| `console.error` | Errors | Terminal + File |
| `console.warn` | Warnings | Terminal |
| `debug mode` | Detailed debug | File only |

---

## 🤝 Contributing

We welcome contributions from the community!

### Getting Started

```bash
# 1. Fork the repository
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/basebot.git

# 3. Create a feature branch
git checkout -b feature/amazing-feature

# 4. Make your changes
# 5. Commit with clear message
git commit -m "Add: amazing feature description"

# 6. Push to your branch
git push origin feature/amazing-feature

# 7. Create a Pull Request
```

### Contribution Guidelines

- ✅ Use clear, descriptive commit messages
- ✅ Add documentation for new features
- ✅ Ensure code passes linting (`npm run lint`)
- ✅ Test your changes thoroughly
- ✅ Follow existing code style and patterns
- ✅ Update README if adding new commands

### Code Style

```javascript
// Use consistent formatting
const functionName = async (param1, param2) => {
  // 2-space indentation
  // Use single quotes for strings
  // Add trailing commas
  const obj = {
    key: 'value',
    num: 123,
  };
  
  return obj;
};
```

---

## 📊 Project Stats

<div align="center">

<img src="https://github-readme-stats.vercel.app/api/pin/?username=nhebotx-md&repo=basebot&theme=tokyonight&hide_border=true" alt="Repo Stats">

<img src="https://github-readme-stats.vercel.app/api/top-langs/?username=nhebotx-md&repo=basebot&layout=compact&theme=tokyonight&hide_border=true" alt="Top Languages">

</div>

---

## 🙏 Credits

| Library | Author | Link |
|---------|--------|------|
| @itsukichan/baileys | Itsukichan | [GitHub](https://github.com/itsukichan/baileys) |
| axios | Axios Team | [GitHub](https://github.com/axios/axios) |
| yt-search | TimeForANinja | [GitHub](https://github.com/TimeForANinja/node-ytsr) |
| fluent-ffmpeg | Fluent FFmpeg | [GitHub](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg) |

---

## 📞 Support

Need help? Reach out to us:

<p align="center">
  <a href="https://wa.me/62881027174423">
    <img src="https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WhatsApp">
  </a>
  <a href="https://t.me/tangxaja">
    <img src="https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram">
  </a>
  <a href="https://github.com/nhebotx-md">
    <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
  </a>
</p>

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 BaseBot MD

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=100&section=footer" width="100%">

**Made with ❤️ by [TangxAja](https://github.com/nhebotx-md)**

<p align="center">
  <samp>If you found this project helpful, please ⭐ star the repository!</samp>
</p>

</div>
