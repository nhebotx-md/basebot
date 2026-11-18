# Audit migrasi PatrickMD V2.1.0

Arsip sumber berisi 33 plugin Owner, 23 Group, 40 Maker, 5 Sticker, dan 9 Downloader. File kosong, command duplikat, serta integrasi yang tidak memiliki konfigurasi/runtime kompatibel tidak dianggap siap dipindahkan.

## Prinsip porting

- Semua plugin ditulis ulang ke CommonJS dan kontrak `ctx` BASEBOT.
- Tidak memakai `global.db`, `global.jereApiKey`, helper fake-quoted PatrickMD, atau Baileys fork PatrickMD.
- Tidak memindahkan `eval` dan `exec`, karena keduanya menjalankan kode/shell arbitrer.
- Tidak menduplikasi command yang sudah berfungsi di BASEBOT.
- Provider eksternal wajib punya validasi URL, batas ukuran, timeout, dan penanganan error.

## Owner

**Sudah diterapkan:** `.setbio`, `.setname`, `.setthumb`, `.block`, `.unblock`, `.listgc`.

**Sudah tersedia di BASEBOT:** plugin manager, health, public/self, get, newsletter, upsw, pengelolaan file sementara, pengaturan menu, serta operasi join/leave dan admin grup melalui `.groupadmin`.

**Belum dipindahkan:** `eval`/`exec` (berbahaya); `addowner`/`delowner` (owner berasal dari `OWNER_NUMBERS`); `getfile`/`savefile`/`getdb` (akses file/database PatrickMD tidak sesuai batas storage BASEBOT); `bc`/`broadcastgc`/`pushkontak` (perlu consent, rate limit, dan pembatasan penerima); `restart` (perlu lifecycle terkontrol); `autoreactsw`/`autoreadsw`/`autotyping`/`randomreact` (perlu integrasi event/presence/status); `sedekah` (database RPG tidak kompatibel); serta `upch`/`botsetting` yang perlu pemetaan API lebih lanjut.

## Group

**Sudah diterapkan:** `.antilink on|off|status` (core menghapus tautan dari anggota non-admin jika bot admin); `.antiswgc`/`.antitagsw` (kontrol penghapusan status mention); `.totag`; dan `.welcome on|off|status` dengan preferensi per grup. `WELCOME_ENABLED=false` tetap menjadi sakelar global.

**Sudah tersedia:** `.groupadmin`, `.community`, `.groupinfo`, `.anggota`, `.hidetag`, `.tagall`, `.grupset`, serta manajemen join request.

**Tidak diduplikasi:** `add`, `kick`, `promote`, `demote`, `revoke`, `linkgc`, `setname`, `setdesc`, `setppgc`, `groupinfo`, dan `hidetag2` karena sudah memiliki padanan. `antiswgc2` yang otomatis mengeluarkan anggota tidak dipindahkan; penghapusan status saja lebih aman. `tagme` tidak ditambahkan ke kategori group karena kategori tersebut dibatasi admin oleh permission manager BASEBOT.

## Maker

**Sudah diterapkan:** 31 command AI image transform dari `lib/toimage.js` dan `.bratfoto`. AI transform mengunggah gambar sementara ke Uguu dan API transformasi pihak ketiga. Batas input 8 MiB, output 15 MiB, dan timeout dibatasi. Pengguna harus memahami bahwa gambar dikirim ke layanan eksternal.

**Menunggu porting:** `fakecall`, `fakegithub`, `fakenotif`, `faketiktok`, `igprofile`, `iqc`, dan `meledak` membutuhkan audit canvas, FFmpeg, API upload, atau endpoint eksternal. File `toputih.js` di arsip kosong; command `toputih` tersedia melalui endpoint transformasi bersama, bukan dari file kosong itu.

## Sticker dan Media BASEBOT

Kategori `media` dipisah secara logis:
- `sticker`: `.sticker`/`.s`, `.brat`, `.bratvid`/`.bratvideo`, dan `.wm`.
- `maker`: image enhancer dan voice changer karena keduanya memproses media, tetapi bukan pembuat sticker.

`stiker.js`, `wm.js`, `brat.js`, dan `bratvid.js` PatrickMD tumpang tindih dengan implementasi BASEBOT. `qc.js` belum dipindahkan karena membutuhkan `@napi-rs/canvas` dan perlu diuji dengan renderer/metadata sticker BASEBOT.

## Downloader

**Sudah diterapkan atau tersedia:** Facebook melalui Soclip BASEBOT (`SOCLIP_API_KEY`), alias `.musik`/`.music`/`.song` pada Play, alias `.yta`/`.ytmp3api`, serta Instagram, TikTok, Play, dan YTMP3 yang sudah ada.

**Menunggu provider/konfigurasi:** `mediafire.js` memakai endpoint BTCH/Jere dan fallback CDN; perlu redirect handling aman. `spotify.js` dan `ytmp4.js` memakai `global.jereApiKey`/Jere API yang tidak disertakan dalam arsip atau konfigurasi BASEBOT. `aio.js` perlu pengujian respons, host file, ukuran, dan redirect sebelum diaktifkan.

## Dependency

Tidak menambahkan paket hanya karena ada di package PatrickMD. Untuk batch ini, `axios` dan `form-data` yang dibutuhkan sudah tersedia. Tidak ada perubahan dependency atau lockfile. Paket tambahan seperti canvas atau downloader spesifik baru ditambahkan saat port terkait siap diuji dan lockfile dapat diperbarui secara konsisten.

## Kriteria tiap batch

1. Plugin lolos validasi dan tidak memiliki command ganda.
2. Unit test mencakup parsing, permission, dan batas media.
3. `npm test` dan `npm run check` lulus pada Node.js 22 dan 24.
4. Tidak mengandalkan API key/provider yang tidak disediakan.
5. Registry aktif tetap aman ketika plugin gagal dimuat atau di-reload.
