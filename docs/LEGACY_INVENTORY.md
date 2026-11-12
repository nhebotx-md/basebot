# Inventaris Legacy BASEBOT

## Kondisi awal

Clone awal berisi 34 file terlacak, kurang lebih 2.7k baris JavaScript, CommonJS, dan tidak memiliki lockfile. Fitur runtime utama semula berada di `index.js` (koneksi, autentikasi, helper Baileys, welcome, listener) dan `message.js` (normalisasi tambahan, scan command directory per pesan, switch/case, logging, permission). Handler di `command/` berupa fungsi lama dengan properti `command/help/tags/owner`; import utilitas mengarah ke `start/lib/`.

## Command yang ditemukan

| Command / alias | Kategori | Akses legacy → target |
| --- | --- | --- |
| `bocchi`, `bocci` | AI | Publik → publik |
| `brat`, `sbrat` | Media/sticker | Publik → publik |
| `bratvid`, `bratvideo` | Media/sticker | Publik → publik |
| `csesi`, `clearsesi` | Owner | Owner → owner-only |
| `delsampah`, `dsampah` | Owner/temp | Owner → owner-only |
| `igdl` | Downloader | Publik → publik |
| `tiktok` | Downloader | Publik → publik |
| `play` | Downloader | Publik → publik |
| `qc` | Media/sticker | Publik → publik |
| `listsampah`, `sampah` | Owner/temp | Owner → owner-only |
| `sticker`, `s` | Media | Publik → publik |
| `upsw` | Owner/status | Owner → owner-only |
| `tupai`, `smooth`, `slow`, `robot`, `reverse`, `nightcore`, `fat`, `fast`, `earrape`, `deep`, `blown`, `bass` | Media/audio | Publik → publik |
| `menu` (ditambah alias `help`) | System | Publik → publik; menu kini registry-driven |
| `get` | Owner/network | Owner → owner-only, URL publik tervalidasi, tanpa redirect |
| `public`, `self` | Owner/runtime | Owner → owner-only |
| `tagall` | Group | Admin grup → admin grup |
| `hidetag`, `h` | Group | Admin grup atau owner → admin grup (owner selalu lolos) |
| `jeslyn` | AI/voice | Publik → publik; TTS memerlukan env API key |
| `enhancer`, `unblur`, `enhance`, `hdr`, `hd`, `remini` | Media | Publik → publik |
| `swm`, `wm`, `stickerwm`, `take` | Media | Publik → publik |
| `reactch` | Owner/channel | Owner → owner-only |
| Event `group-participants.update` | Group/welcome | Aktif default pada legacy → `WELCOME_ENABLED=true` default, plugin event |

Default prefix legacy beragam; target menggunakan `BOT_PREFIX` (default titik). Fitur `eval`, `exec`, serta blok kode arbitrer tidak dimigrasikan karena merupakan akses eksekusi jarak jauh yang tidak aman.

## File dan dependency legacy

- `index.js`: Baileys socket, session, pairing, listener, extension send/download, auto-restart via file watch.
- `message.js`: handler raksasa 541 baris, scan ulang `command/` pada setiap pesan, switch command, akses shell/eval.
- `settings/config.js`: nilai global owner/channel/sticker/pairing/TTS.
- `command/*.js`: 13 handler fitur di atas.
- `start/lib/function/`: Instagram downloader, Remini enhancer, dan helper YouTube MP3.
- `start/lib/exif.js`: konversi/sticker EXIF dengan FFmpeg dan node-webpmux.
- `start/lib/myfunction.js`: helper campuran, termasuk credential email hardcoded; dihapus karena tidak dipakai setelah migrasi.
- `start/lib/database/owner.json`: sumber tambahan owner (array kosong pada checkout).
- `start/tmp/`: bercampur folder sampah temp dan file `.nomedia`/artefak arsip.

Dependency langsung yang tetap digunakan dikunci di manifest: `@itsliaaa/baileys`, `pino`, `axios`, `node-fetch` 2.x untuk helper CommonJS yang ada, `yt-search`, `form-data`, `@ffmpeg-installer/ffmpeg`, `fluent-ffmpeg`, `node-webpmux`, `@napi-rs/image` (Baileys image backend), dan `ws` (Node <22). `minimatch` transitif di-override ke versi aman. Package lama yang merupakan modul Node bawaan, tidak digunakan, atau berupa integrasi Telegram/Redis yang tidak dipakai dihapus. Versi tepat/closure tercatat di `package-lock.json`.

## Temuan keamanan dan reliability

1. Helper email memiliki kredensial hardcoded; file dihapus, credential perlu dirotasi. Clone shallow tidak cukup untuk memastikan riwayat Git remote bersih.
2. `eval` dan shell `exec` lama dapat menjalankan kode arbitrer melalui WhatsApp; dihapus. Voice changer sekarang menjalankan FFmpeg dengan `spawn` dan argumen terkontrol.
3. Konfigurasi global menyimpan nomor owner dan pairing code; dipindah ke `.env`.
4. Message switch menggabungkan parsing/permission/fitur dan menu statis; kini core/plugin dipisah dan menu dibangun dari registry.
5. File temp session dan dependency dapat terpapar; ignore rules mencakup `.env`, session/auth, log, storage temp, database dan credential umum.
6. Request luar dan media lama sebelumnya kurang konsisten timeout/size-limit; sejumlah entrypoint sudah dibatasi. Integrasi provider eksternal masih memerlukan pemantauan terhadap perubahan API.
