# BASEBOT

BASEBOT adalah framework bot WhatsApp berbasis **Node.js, CommonJS, dan Baileys**. Command dipisahkan ke direktori `plugins/`, sedangkan koneksi WhatsApp, lifecycle, permission, database, logging, dan eksekusi command dikelola oleh core di `src/`.

Project ini menggunakan sistem plugin modular: metadata plugin divalidasi saat startup, command dan alias didaftarkan ke registry, lalu dieksekusi melalui dispatcher terpusat. Menu dibangun dari registry aktif, bukan daftar command statis.


## Snapshot repository

> Snapshot ini menggambarkan branch `feat/database-backup-restore` untuk PR #52 per 21 November 2026. Base branch `main`: `da8713be42b987f96275a379771203e0eb8c3478`.

| Komponen | Kondisi terbaru |
|---|---|
| Versi aplikasi | `2.0.0` |
| Runtime | Node.js `>=22.13.0` |
| Arsitektur | CommonJS, core modular, plugin registry |
| Plugin | **55 file plugin** |
| Command terdaftar | **173 command dan alias** |
| Kategori direktori plugin | 11 direktori |
| Unit test | 50 file test |
| Baileys | `@itsliaaa/baileys@0.5.6` |
| CI PR #52 | Lulus pada Node.js 22 dan 24 |

Kategori plugin saat ini mencakup `ai`, `downloader`, `group`, `image`, `sticker`, `media`, `message`, `owner`, `account`, `tools`, dan `finance`. Jumlah plugin dan command dihitung dari registry serta dijaga melalui pengujian aplikasi.

Perubahan terbaru yang sudah masuk ke `main`:
- **PR #49:** format balasan command dengan blockquote WhatsApp, misalnya `> .ping`, termasuk caption media dan pesan progres.
- **PR #50:** pemeriksaan ID dan metadata WhatsApp Channel melalui `.idch` / `.cekidch`, serta Group melalui `.idgc` / `.cekidgc`.

Tautan: [base commit](https://github.com/nhebotx-md/basebot/commit/da8713be42b987f96275a379771203e0eb8c3478) · [CI](https://github.com/nhebotx-md/basebot/actions/runs/44721680450) · [PR #49](https://github.com/nhebotx-md/basebot/pull/49) · [PR #50](https://github.com/nhebotx-md/basebot/pull/50)


## Fitur utama

- **WhatsApp runtime:** pairing code Baileys, manajemen koneksi, reconnect, event dispatcher terpusat untuk reaction, presence, group join request, perubahan grup, newsletter, pembaruan suara poll, dan shutdown terkontrol.
- **Plugin registry:** pemindaian direktori plugin secara rekursif dan deterministik, validasi metadata, deteksi nama/command duplikat, isolasi file plugin yang gagal dimuat, serta status plugin aktif/nonaktif.
- **Menu dinamis:** `.menu` dan `.help` menampilkan direktori fitur dengan lima tema yang dipilih owner melalui `.setmenu v1` sampai `.setmenu v5`. `.catmenu` memiliki pilihan tema independen melalui `.setcatmenu v1` sampai `.setcatmenu v5`. `.menui` membuka kategori melalui tombol native-flow di chat pribadi; command teks yang sama selalu disertakan sebagai fallback untuk klien yang tidak menampilkan tombol. Pilihan tema tersimpan di database dan tidak berubah bergiliran. Kategori dan command dihitung dari plugin aktif yang boleh dilihat oleh pengguna.
- **Manajemen plugin:** owner dapat melihat informasi plugin, mengaktifkan/menonaktifkan plugin, reload manual, dan auto reload saat file plugin JavaScript berubah. Registry kandidat divalidasi dahulu; reload gagal tidak mengganti registry aktif.
- **Permission manager:** owner-only, group-only, private-only, adminOnly, botAdminOnly, role, grant akses command/kategori, dan mode public/self. Pemeriksaan menu dan eksekusi memakai aturan permission yang sama.
- **Profil pengguna:** registrasi, role user/premium/moderator, level, EXP, saldo koin, serta statistik pesan dan command.
- **Database JSON & Disaster Recovery:** collection users, groups, dan plugins; penulisan atomik; baseline backup otomatis saat startup dan snapshot berkala default setiap 6 jam; manifest SHA-256; retensi terkonfigurasi; preflight integritas sebelum init; pemulihan otomatis dari snapshot lengkap yang diverifikasi; quarantine file sebelum recovery; fail-closed jika tidak ada recovery point; notifikasi owner setelah koneksi WhatsApp tersedia; serta restore manual dua langkah dengan safety backup. Panduan: `docs/JSON_DATABASE.md`.
- **Runtime monitoring:** snapshot berkala, riwayat 120 sampel, alert heap/event-loop/antrean database, serta statistik job queue melalui `.health history`, `.health alerts`, dan `.health detail`.
- **System Doctor:** `.doctor` memeriksa versi Node.js, konfigurasi lokal/template, dependency penting, akses direktori, database, koneksi WhatsApp, dan plugin tanpa menampilkan nilai API key.
- **Provider Manager:** provider downloader memakai timeout, retry terbatas, circuit breaker/cooldown, fallback berurutan, dan statistik sukses/gagal yang bertahan selama runtime.
- **Job Queue:** command plugin dijalankan melalui antrean FIFO berbobot prioritas dengan batas concurrency, kapasitas antrean, pembatalan job, dan shutdown terkontrol.
- **Logger terminal:** dashboard startup bergaya console profesional, ringkasan plugin, tahapan boot, status koneksi, aktivitas command bertimestamp, metadata log yang mudah dibaca, dan panel shutdown. Mendukung output pretty/JSON serta file JSONL berotasi. Panel pesan memakai label generik dan tidak menampilkan nama kontak, nama grup, nomor/JID, atau isi pesan.
- **Plugin process feedback:** plugin dapat menampilkan tahapan kerja yang informatif melalui satu pesan status yang diperbarui, disertai reaksi mulai/selesai/gagal. Dispatcher otomatis menutup status saat plugin selesai atau gagal.
- **Plugin error diagnostics:** jika eksekusi command plugin gagal, bot mengirim laporan berisi nama plugin, command, tahap, ID referensi, detail error yang disamarkan, kemungkinan penyebab, dan langkah perbaikan. Kegagalan plugin event dicatat dengan ID referensi pada log server.
- **Grup dan pesan:** command admin untuk info/undangan, pengaturan grup, anggota dan join request; poll dengan hasil suara anonim; tindakan pesan untuk reaksi, pin/unpin, edit, dan hapus dengan pemeriksaan kepemilikan; wrapper spoiler, view-once, dan ephemeral untuk media; builder pesan kaya untuk code block, tabel, tautan, rich response, carousel, dan native-flow; manajer grup, Community, dan Channel.
- **Keamanan:** resolver identitas PN/LID dengan cache dan fallback fail-closed, permission fail-closed saat metadata grup tidak tersedia, validasi URL publik untuk mengurangi SSRF, serta pembatasan path dan permission file storage.

## Katalog plugin

Daftar berikut berasal dari file plugin yang tersedia pada branch dokumentasi ini. Plugin yang gagal validasi atau dinonaktifkan tidak akan dianggap aktif di runtime.

| Kategori | Plugin dan fungsi |
|---|---|
| AI | `bocchi` (alias `.bocci`/`.bocchi`) untuk percakapan dengan asisten Bocchi; `jeslyn` untuk asisten AI. |
| Downloader | `.fb`/`.facebook` untuk video dan foto Facebook melalui Soclip; `.play`/`.musik`/`.music`/`.song` untuk pencarian audio; `.igdl` untuk Reels/foto/carousel Instagram yang dikirim sebagai album native; `.tt`/`.tiktok` untuk video, slideshow foto sebagai album native, dan audio TikTok; `.ytmp3` untuk audio YouTube. Soclip menjadi provider utama dengan fallback provider lama dan yt-dlp lokal untuk audio YouTube. |
| Group | `.antilink on|off|status` untuk menghapus tautan dari anggota non-admin; `.antiswgc`/`.antitagsw` untuk mengatur penghapusan status yang menandai grup; `.totag` untuk mengirim ulang pesan teks yang dibalas dengan mention seluruh anggota; `.groupadmin` untuk pembuatan grup, ubah nama/deskripsi, undangan, pemeriksaan link, dan keluar grup dengan kontrol owner/admin; `.community` untuk Community, subgrup, tautan, undangan, dan persetujuan; `hidetag`/`h` untuk mention anggota grup; `tagall` untuk menyebut seluruh anggota; `welcome on|off|status` untuk mengatur pesan sambutan per grup dan event anggota masuk/keluar; `groupinfo`/`grupinfo` untuk info dan tautan undangan; `grupset` untuk izin grup dan pesan sementara; `anggota` untuk add/remove/promote/demote dengan mention; `joinrequests`/`permintaanmasuk` untuk permintaan pending; `joinrequest`/`permintaan` untuk approve/reject yang sudah diverifikasi pending. Operasi mutasi memerlukan bot sebagai admin. |
| Image | AI image transform dari arsip PatrickMD: `.tobotak`, `.tochibi`, `.tofunk`, `.tofigura`/`tofigurav2`/`tofigurav3`, `.bratfoto` untuk gambar Brat; `.toghibli`, `.tohijab`, `.tojapanese`, `.tojepang`, `.tokacamata`, `.tokamboja`, `.tolego`, `.toliquor`, `.tomaid`, `.tomirror`, `.tomoai`, `.tomonyet`, `.topacar`, `.topeci`, `.topiramida`, `.toputih`, `.toreal`, `.toroblox`, `.toroh`, `.totato`, `.totua`, `.toviking`, `.tozombie`, `.tounderground`, dan `.tohitam`. Gambar diunggah ke layanan pemrosesan pihak ketiga; batas sumber 8 MB dan hasil 15 MB. |
| Sticker | Sticker maker (`sticker`/`s`), Brat statis (`brat`) dan animasi (`bratvid`/`bratvideo`) melalui REST API, serta sticker watermark (`wm` dan alias). |
| Media processing | Image enhancer (`enhancer`, `unblur`, `enhance`, `hdr`, `hd`, `remini`) dan voice changer berbasis FFmpeg. |
| Message | `.richmsg` untuk code block, tabel, inline links, rich response, carousel, dan native-flow melalui satu builder; `.poll [--multi] pertanyaan \\| opsi1 \\| opsi2` untuk membuat poll; `.pollhasil` (balas pesan poll bot) untuk melihat jumlah suara anonim; `.react`, `.pin`, `.unpin`, `.edit`, dan `.del` untuk tindakan terhadap pesan yang dibalas; `.spoiler`, `.viewonce`, dan `.ephemeral` untuk mengirim ulang gambar/video dengan wrapper pesan Baileys. Edit dibatasi ke pesan bot sendiri; hapus hanya pesan bot sendiri atau oleh admin grup. |
| Owner | `.setbio`, `.setname`, `.setthumb`, `.block`, `.unblock`, dan `.listgc` untuk pengaturan profil bot, blokir kontak, dan daftar grup; `.newsletter` untuk follow/unfollow, mute/unmute, info, subscriber, pembuatan Channel, perubahan metadata, dan foto; pengaturan mode `public`/`self`, plugin manager, pengaturan role dan grant akses, pengambilan URL publik tervalidasi, publikasi WhatsApp Status, reaksi Channel, pengaturan tema menu melalui `.setmenu`/`.setcatmenu`, serta pengelolaan file sementara dan sesi. |
| Account / Tools | `daftar` untuk registrasi; `profile`/`me` untuk melihat profil dan statistik; `.menui` untuk memilih kategori lewat tombol interaktif di chat pribadi, dengan command teks sebagai fallback; `.idch`/`.cekidch` untuk mengambil ID dan metadata Channel dari tautan, kode invite, JID, atau Channel aktif; `.idgc`/`.cekidgc` untuk mengambil ID dan metadata grup dari grup aktif, tautan invite, kode undangan, atau JID. |

Catatan: `viewonce` tidak mencegah penerima mengambil tangkapan layar atau merekam layar. Jangan gunakan sebagai jaminan kerahasiaan.

Voice changer menyediakan preset audio seperti `bass`, `blown`, `deep`, `earrape`, `fast`, `fat`, `nightcore`, `reverse`, `robot`, `slow`, `smooth`, dan `tupai`. Gunakan sesuai command yang terdaftar pada menu.

### Menu

- `.menu` atau `.help`: direktori utama.
- `.catmenu`: indeks kategori yang dapat diakses.
- `.catmenu <kategori>`: daftar plugin, command utama, alias, deskripsi, dan contoh penggunaan pada kategori tersebut.
- `.menui`: membuka tombol kategori interaktif di chat pribadi; memilih kategori menjalankan command `.catmenu` yang sesuai. Command teks selalu disertakan agar tetap dapat digunakan saat tombol tidak ditampilkan oleh klien WhatsApp.
- `.setmenu v1` sampai `.setmenu v5`: memilih tema menu utama melalui plugin owner mandiri (`plugins/owner/setmenu.js`).
- `.setcatmenu v1` sampai `.setcatmenu v5`: memilih tema category menu melalui plugin owner mandiri (`plugins/owner/setcatmenu.js`), terpisah dari menu utama.

Pilihan tema setelah redesign dashboard:
- `v1` Showcase: panel sistem dan direktori fitur dengan bingkai ringkas.
- `v2` Terminal: format dashboard terminal yang mengikuti referensi Nhebotx, menampilkan identitas pengguna, status, mode, tiga zona waktu Indonesia, tanggal, uptime, OS, RAM, dan total command. Pada tema ini `.menu` dan `.catmenu` tetap menyediakan daftar interaktif WhatsApp dengan fallback teks.
- `v3` Minimal: hierarki informasi padat, tanpa ornamen berlebihan, tetap memuat laporan sistem dan direktori fitur.
- `v4` Premium: panel profil, monitor sistem, dan direktori fitur dengan pemisah visual yang konsisten.
- `v5` Editorial: indeks sistem dan daftar fitur bergaya publikasi teknis yang mudah dipindai.

Nama bot mempertahankan kapitalisasi sesuai konfigurasi. Kelima tema menggunakan sumber data runtime yang sama, sehingga identitas pengguna, permission, kategori, jumlah command, versi, prefix, dan status sistem tidak berbeda antar-layout. Tema menu utama dan category menu tetap independen serta tersimpan pada collection `plugins` setelah restart. Pemilihan tema hanya mengubah presentasi; tidak mengubah command, registry, atau permission. Plugin pengaturan tema hanya dapat dijalankan owner bot yang terverifikasi.

Daftar menu mengikuti registry dan permission pengguna. Plugin owner-only tidak ditampilkan kepada pengguna biasa; plugin group-only mengikuti konteks grup dan izin admin yang berlaku.

## Persyaratan

- Node.js **22.13.0 atau lebih baru**.
- npm yang kompatibel dengan lockfile.
- Koneksi internet untuk WhatsApp dan provider eksternal yang dipakai plugin.
- FFmpeg disediakan oleh dependency `@ffmpeg-installer/ffmpeg` untuk fitur pemrosesan audio/media tertentu.

Dependency Baileys dikunci pada `@itsliaaa/baileys@0.5.6`; gunakan lockfile project dan jangan mengganti versi dependency secara manual tanpa menjalankan test.

## Instalasi dan menjalankan

```bash
git clone https://github.com/nhebotx-md/basebot.git
cd basebot
npm ci
cp .env.example .env
cp settings.example.js settings.js
```

Edit `settings.js` lokal untuk mengatur nomor owner, nomor pairing, prefix, mode bot, nama bot, timezone, metadata sticker, logging, limit command, direktori data, XP, dan perilaku plugin. File `settings.js` sengaja diabaikan Git agar nomor owner dan konfigurasi pribadi tidak ikut terunggah. Kapasitas antrean dapat diatur melalui `commandLimits.maxQueued` (default 100), sedangkan batas waktu, retry, ambang circuit breaker, dan cooldown provider dapat diatur melalui `downloaders.providerTimeoutMs`, `providerRetries`, `providerFailureThreshold`, dan `providerCooldownMs`. `settings.example.js` adalah template publik. File `.env` hanya digunakan untuk API key/provider credentials seperti `TTS_API_KEY` dan `SOCLIP_API_KEY`.

Gunakan nomor WhatsApp dengan kode negara, tanpa tanda `+` atau spasi. Isi `owners` di `settings.js` dengan nomor owner milik sendiri. Setelah konfigurasi:

```bash
npm start
```

Untuk memperbarui instalasi yang sudah ada tanpa menimpa `settings.js`, sesi, atau database lokal:

```bash
cd ~/basebot
git pull --ff-only
npm ci
npm test
npm run check
npm start
```

Jika folder repository berada di lokasi lain, ganti `~/basebot` dengan path instalasi. Perintah `npm ci` menyelaraskan dependency dengan `package-lock.json`; jangan menghapus folder `session/` atau `data/database/` hanya untuk melakukan update.


Pairing code dibuat oleh Baileys dan dicetak ke terminal hanya ketika sesi belum terdaftar. Jangan mengisi `PAIRING_CODE` dengan kode tetap. Setelah pairing berhasil, kredensial disimpan pada direktori sesi.

## Pengujian

```bash
npm test
npm run check
```

- `npm test`: menjalankan unit test Node.js tanpa perlu menghubungkan akun WhatsApp.
- `npm run check`: memeriksa sintaks entry point dan file JavaScript pada direktori source/plugin yang dikonfigurasi dalam script.

CI repository menguji Node.js 22 dan Node.js 24. Jalankan kedua perintah di atas sebelum mengirim perubahan.

## Konfigurasi penting

| Variabel | Kegunaan |
|---|---|
| `BOT_NAME`, `OWNER_NAME` | Nama bot dan owner pada tampilan. |
| `OWNER_NUMBERS` | Identitas owner bot yang menjadi sumber hak owner. |
| `BOT_PREFIX` | Prefix command. |
| `PUBLIC_MODE` | Mode publik atau self. |
| `PAIRING_PHONE` | Nomor untuk meminta pairing code saat sesi belum terdaftar. |
| `TIMEZONE` | Zona waktu tampilan tanggal/jam. |
| `LOG_LEVEL` | Level log minimum. |
| `LOG_FORMAT` | `pretty` untuk terminal atau `json` untuk log terstruktur. |
| `LOG_COLOR` | `auto`, `always`, atau `never`. |
| `LOG_FILE_ENABLED` | Menulis log JSONL ke disk; default `true`. Set `false` untuk mematikan file log. |
| `LOG_FILE_NAME` | Nama file log di dalam `LOG_DIR`; tidak menerima path. Default `basebot.jsonl`. |
| `LOG_FILE_MAX_BYTES`, `LOG_FILE_MAX_FILES` | Batas ukuran per file dan jumlah file termasuk file aktif; default 5 MiB dan 5 file. File log memakai permission privat. |
| `COMMAND_RATE_LIMIT`, `COMMAND_RATE_WINDOW_MS` | Batas command per pengirim dan jendela waktu; default 8 command/10 detik. Nilai `0` menonaktifkan rate limit. |
| `MAX_CONCURRENT_COMMANDS` | Batas pekerjaan plugin yang berjalan bersamaan; default 20. |
| `SESSION_DIR`, `TEMP_DIR`, `LOG_DIR` | Lokasi data sesi, file sementara, dan log. |
| `PLUGINS_DIR`, `PLUGIN_RELOAD` | Direktori plugin dan opsi reload saat proses pemuatan. |
| `PLUGIN_AUTO_RELOAD`, `PLUGIN_WATCH_DEBOUNCE_MS` | Watcher file plugin JavaScript tanpa restart bot; default aktif dengan debounce 700 ms. |
| `STICKER_API_ASEPHARYANA_ENABLED` | Mengaktifkan fallback host alternate sticker API; default nonaktif. |
| `TTS_API_KEY`, `TTS_VOICE_ID` | Kredensial/provider TTS bila fitur tersebut dikonfigurasi. |
| `SOCLIP_API_KEY` | API key Soclip untuk Instagram, TikTok, dan YouTube. Simpan hanya di `.env`. |
| `DOWNLOADER_FALLBACK` | Mengaktifkan provider cadangan jika Soclip gagal; default `true`. |
| `YTDLP_ENABLED`, `YTDLP_PATH` | Mengaktifkan fallback audio YouTube lokal dan menentukan path executable `yt-dlp`; memerlukan FFmpeg. |

Lihat `.env.example` untuk daftar konfigurasi lengkap. Jangan commit `.env`, session, database produksi, atau log yang berisi data pribadi.

## Permission dan identitas

Hak owner hanya diberikan jika identitas pengirim yang telah dinormalisasi cocok dengan salah satu nomor pada `OWNER_NUMBERS`. Status admin grup, `fromMe`, nama profil, atau jabatan grup tidak menggantikan identitas owner.

Permission plugin dapat memakai:

- `ownerOnly: true`: hanya owner bot terverifikasi.
- `groupOnly: true`: hanya konteks grup.
- `privateOnly: true`: hanya chat pribadi.
- `adminOnly: true`: memerlukan admin grup.
- `botAdminOnly: true`: bot harus menjadi admin grup.
- `metadataRequired: true`: core memuat metadata grup untuk pemeriksaan permission per-subcommand.
- `roles: ['premium', 'moderator']` atau `minRole: 'premium'`: pembatas role.
- `accessRequired: true`: perlu grant akses command/kategori dari owner.

Kategori `owner` otomatis diperlakukan sebagai owner-only dan kategori `group` memiliki pembatasan grup/admin sesuai permission manager. Jika metadata grup tidak dapat diambil, status admin dianggap tidak valid (fail-closed).

Pengguna biasa di grup harus registrasi dengan `.daftar nama`. Role aplikasi yang dapat diberikan adalah `user`, `premium`, dan `moderator`; role owner tidak dapat diberikan melalui database. Owner dapat menggunakan `.setrole`, `.grantakses`, dan `.cabutakses` untuk pengelolaan akses.

## Finance Manager (lokal)

Kategori `finance` menyediakan manajemen keuangan pribadi untuk setiap JID WhatsApp. Tidak membutuhkan API key, akun eksternal, atau koneksi PocketSmith. Data disimpan sebagai namespace `finance` di profil masing-masing dalam `users.json`, sehingga tetap tercakup dalam backup dan disaster recovery JSON yang sudah ada.

Command utama: `.finance` / `.balance` untuk dashboard, `.income nominal kategori`, `.expense nominal kategori`, `.transfer nominal kategori`, `.history [jumlah]`, `.searchtrx kata`, `.deletetrx ID`, `.setbudget kategori nominal`, `.budget`, `.debt nama nominal`, `.paydebt ID nominal`, `.debtreport`, `.saving nama nominal`, `.paygoal ID nominal`, `.recurring income|expense nominal kategori [daily|weekly|monthly|yearly]`, `.runrecurring ID`, `.monthly [YYYY-MM]`, `.yearly [YYYY]`, dan `.exportfinance` untuk CSV.

Setiap transaksi, anggaran, utang, dan target tabungan hanya dapat dibaca atau diubah oleh pemilik JID tersebut. Transaksi rutin tidak dijalankan otomatis di background: pengguna memprosesnya secara eksplisit dengan `.runrecurring ID`, agar bot tidak mencatat pengeluaran tanpa konfirmasi. Nominal disimpan sebagai integer Rupiah; gunakan angka tanpa simbol mata uang. Penghapusan transaksi bersifat permanen dan harus menyebut ID transaksi.

## Pemeriksaan ID WhatsApp Channel dan Group

- `.idch <link_channel|kode_invite|channelJid>` atau `.cekidch ...`: memeriksa metadata Channel melalui API `newsletterMetadata`. Jika dijalankan tanpa argumen dari chat Channel, plugin menggunakan metadata Channel aktif yang tersedia pada context.
- `.idgc` atau `.cekidgc`: dari dalam grup, menampilkan ID dan metadata grup aktif. Untuk pemeriksaan dari chat pribadi, gunakan `.idgc <link_grup|kode_invite|groupJid>`; tautan undangan diperiksa melalui `groupGetInviteInfo`, sedangkan JID diperiksa melalui `groupMetadata`.
- Informasi yang ditampilkan meliputi nama, ID/JID, deskripsi, jumlah subscriber/anggota bila disediakan, status/verifikasi Channel, owner grup bila tersedia, waktu pembuatan, pengaturan grup, dan kode invite yang diperiksa. Field yang tidak dikirim WhatsApp ditandai tidak tersedia, tidak ditebak sebagai nilai nol.
- Pemeriksaan hanya membaca metadata. Plugin tidak otomatis follow Channel, join grup, mengubah pengaturan, atau membagikan ulang tautan undangan.

## Laporan error plugin

Jika `plugin.execute(ctx)` melempar error, dispatcher akan:

1. Membuat ID referensi unik.
2. Mencatat plugin, command, tahap, ID referensi, dan exception ke log server.
3. Mengirim balasan WhatsApp yang berisi status, jenis error, detail yang sudah disamarkan, dugaan penyebab, dan langkah pemeriksaan.
4. Mengembalikan hasil dispatcher yang menyertakan ID referensi untuk observabilitas internal.

Diagnostik mengenali gangguan jaringan/timeout, respons HTTP (termasuk autentikasi, endpoint, dan rate limit), masalah file/permission, dependency FFmpeg yang hilang, serta error pemrograman umum. Pesan pengguna tidak menampilkan stack trace, URL, path lokal, atau kredensial. Kegagalan plugin event dicatat di log dengan ID referensi; event tidak selalu memiliki konteks balasan chat.

ID referensi pada pesan pengguna dapat dicocokkan dengan record error di log server. Simpan log secara privat dan jangan mengirim file log mentah ke ruang publik.

## Logger

`LOG_FORMAT=pretty` adalah format terminal standar dengan level berwarna, komponen log, metadata key-value yang dirapikan, dashboard startup, tahapan boot, dan ringkasan shutdown. Dashboard mendeteksi Termux/Android, menunjukkan lebar layar dan mode warna, lalu menyesuaikan panel serta baris log untuk terminal sempit. Gunakan `LOG_FORMAT=json` untuk record JSON terstruktur. `LOG_COLOR=auto` mengikuti TTY, `TERM=dumb`, dan variabel `NO_COLOR`; nilai `always` dan `never` dapat dipakai untuk memaksa perilaku warna. File log JSONL berotasi berdasarkan ukuran dan ditutup saat shutdown. Aktivitas command menyertakan correlation ID yang sama pada log sukses/gagal dan laporan error plugin. Log dirancang tanpa nomor/JID, nama kontak/grup, atau isi pesan; simpan direktori log secara privat karena tetap berisi metadata operasional dan stack error yang sudah disanitasi.

## Struktur project

- `index.js`, `src/app.js`: entry point dan bootstrap.
- `src/core/client`, `src/core/connection`: client WhatsApp, pairing, reconnect, dan lifecycle.
- `src/core/events`: handler pesan, koneksi, kontak, peserta grup, dan dispatcher event Baileys terpusat.
- `src/core/messaging`: normalisasi pesan, parser, context, dispatcher, dan menu.
- `src/core/plugins`: validator, registry, loader, dan plugin manager.
- `src/core/security`: permission manager dan validasi URL publik.
- `src/core/database`: database JSON dan service pengguna/grup.
- `src/core/services`: logger, pesan, rich message, identity resolver, media, downloader, storage, finance manager.
- `plugins/<kategori>/*.js (ai, downloader, group, image, sticker, media, message, owner, account, tools, finance)`: fitur bot.
- `tests/unit/*.test.js`: unit test.
- `docs/`: dokumentasi API dan pengembangan.

Lihat [Panduan Pengembangan Plugin](docs/PLUGIN_DEVELOPMENT.md) dan [Plugin API](docs/PLUGIN_API.md) sebelum menambah fitur. Eksekusi kode atau shell arbitrer melalui pesan WhatsApp sengaja tidak disediakan.

## Troubleshooting

- **Pairing code tidak muncul:** pastikan `PAIRING_PHONE` berisi nomor dengan kode negara. Pairing code hanya diminta saat sesi belum terdaftar. Jangan hapus direktori session sebagai langkah pertama karena berisi kredensial login.
- **Status `515 / restartRequired`:** setelah pairing, reconnect dapat menjadi langkah normal ketika kredensial disimpan. Tunggu socket baru sampai status `open`; jika berulang, periksa log koneksi.
- **Plugin dilewati saat startup:** periksa record log untuk `file`, `stage`, dan error. Jalankan `npm ci`, lalu perbaiki file/dependency yang bermasalah.
- **Command media gagal:** periksa konektivitas dan kuota provider, ukuran file, timeout, serta dependency FFmpeg.
- **Error command plugin:** catat ID `REF` dari balasan bot, lalu cocokkan dengan log server.
- **Storage/session gagal ditulis:** pastikan direktori dapat dibuat dan diakses oleh user proses. Jangan jadikan session publik.

## Sticker API

Satu plugin media menyediakan `.brat <teks>` untuk sticker Brat statis dan `.bratvid <teks>` untuk sticker animasi. Alias `.bratvideo` tetap tersedia. `.stickerapi brat <teks>` dan `.stickerapi animated <teks>` (alias `.stapi`) juga dipertahankan untuk kompatibilitas.

Siputzx menjadi satu-satunya provider. BASEBOT membatasi teks hingga 300 karakter, timeout 15 detik, respons 8 MiB, memvalidasi signature PNG/GIF, lalu mengonversi media ke format sticker WhatsApp dengan metadata pack lokal. Jika API gagal atau format respons tidak valid, bot melaporkan kegagalan tanpa mengirim file yang belum tervalidasi. Jangan kirim teks rahasia karena teks diproses oleh provider pihak ketiga.
