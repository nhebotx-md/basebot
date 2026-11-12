# Laporan Teknis Refactor BASEBOT

## Ringkasan repository sebelum refactor

Checkout awal adalah clone dangkal branch `main`, berisi 34 file terlacak dan sekitar 2.7k baris JavaScript, menggunakan CommonJS, tanpa lockfile. `index.js` menangani koneksi, pairing, event, welcome dan helper Baileys; `message.js` memuat parsing, permission, scan direktori command pada setiap pesan, serta switch/case sekitar 541 baris. Handler command lama disimpan terpisah di `command/` tetapi belum memakai plugin registry standar.

Risiko baseline yang ditemukan: email/SMTP credential tertanam di helper, nomor owner/pairing berada di config global, `eval` dan shell `exec` dapat dipicu lewat pesan, request media tidak konsisten dibatasi, watcher berpotensi menggandakan handler, serta file temporary dan aset bercampur. Karena clone shallow, audit seluruh riwayat Git remote tidak dapat dipastikan.

## Arsitektur akhir

Aplikasi memiliki satu entry point (`index.js` → `src/app.js`), konfigurasi tervalidasi dari environment, client Baileys terisolasi, connection/pairing manager, empat handler event khusus, normalizer/context builder bersama, parser prefix, satu registry dan loader plugin deterministik, satu dispatcher untuk command/event, permission manager fail-closed, serta service bersama untuk pesan, media, storage dan logging.

Command dipindahkan ke `plugins/<kategori>/`; core tidak memuat implementasi command. Menu membaca registry aktif. Plugin baru mengikuti satu kontrak CommonJS yang didokumentasikan di `docs/PLUGIN_API.md`.

## Struktur direktori final

```text
index.js
src/
  app.js
  config/
  core/
    client/ connection/ events/ messaging/ plugins/ security/ services/
plugins/
  ai/ downloader/ group/ media/ owner/ system/
tests/unit/
docs/
start/lib/                 # helper legacy yang masih digunakan
.env.example
package.json
package-lock.json
```

## File yang dibuat

- `src/app.js`, `src/config/config-loader.js`, `src/config/config-validator.js`.
- Client/koneksi/event: `src/core/client/create-client.js`, `src/core/connection/connection-manager.js`, `pairing-manager.js`, `src/core/events/connection-update.js`, `contacts-update.js`, `group-participants.js`, `messages-upsert.js`.
- Messaging/plugin/security/services: `src/core/messaging/command-dispatcher.js`, `command-parser.js`, `context-builder.js`, `normalize-message.js`; `src/core/plugins/plugin-loader.js`, `plugin-registry.js`, `plugin-validator.js`; `src/core/security/permission-manager.js`, `safe-url.js`; `src/core/services/logger.service.js`, `media.service.js`, `message.service.js`, `storage.service.js`.
- Plugin modules (24): `plugins/ai/{bocchi,jeslyn}.js`; `plugins/downloader/{download-igdl,download-tiktok,play}.js`; `plugins/group/{hidetag,tagall,welcome}.js`; `plugins/media/{brat,bratvid,image-enhancer,qc-sticker,sticker-watermark,sticker,voicechanger}.js`; `plugins/owner/{clearsesion,delsampah,get,public,react-channel,sampah,self,upsw}.js`; `plugins/system/menu.js`.
- Tests (11 file): `tests/unit/{app,client-pairing,connection,context,core,integration,plugin-loader,plugin-regressions,rate-limit,security-config,storage}.test.js`.
- Dokumen: `docs/{ARCHITECTURE,CHANGELOG,COMPATIBILITY,LEGACY_INVENTORY,MIGRATION,PLUGIN_API,PLUGIN_DEVELOPMENT,REFACTOR_PLAN,REFACTOR_REPORT}.md`.
- Konfigurasi/package: `.env.example`, `package-lock.json`.

## File yang dimigrasikan, diubah dan dihapus

Handler lama secara fungsional dimigrasikan ke plugin (nama source berubah karena kontraknya ditulis ulang): `command/bocchi.js`, `brat.js`, `bratvid.js`, `clearsesion.js`, `delsampah.js`, `download-igdl.js`, `download-tiktok.js`, `play.js`, `qc-sticker.js`, `sampah.js`, `sticker.js`, `upsw.js`, dan `voicechanger.js`; command switch di `message.js` juga dipecah ke plugin group/media/AI/owner/system. Daftar command, alias dan access control ada di `docs/LEGACY_INVENTORY.md`.

File existing yang diubah: `.gitignore`, `README.md`, `index.js`, `package.json`, `start/lib/exif.js`, `start/lib/function/igdl.js`, `start/lib/function/remini.js`, dan `start/lib/function/ytmp3.js`.

File legacy yang dihapus: seluruh 13 handler `command/*.js` di atas setelah migrasi; `message.js` (dispatcher/switch lama); `settings/config.js` (config global); `start/lib/color.js`, `start/lib/connection/connect.js`, `start/lib/converter.js`, `start/lib/fquoted.js`, dan `start/lib/myfunction.js` (helper lama/tidak lagi dipakai, termasuk helper yang memiliki SMTP credential); `start/lib/database/owner.json` (sumber owner kosong yang digantikan environment); `start/test`; serta artefak `start/tmp/.nomedia` dan `start/tmp/PaxHeaders.0/.nomedia` yang tercampur dengan temp runtime.

## Command dan fitur

Alias lama dipertahankan: `bocchi/bocci`, `brat/sbrat`, `bratvid/bratvideo`, `csesi/clearsesi`, `delsampah/dsampah`, `igdl`, `tiktok`, `play`, `qc`, `listsampah/sampah`, `sticker/s`, seluruh alias voice changer, `menu/help`, `get`, `public`, `self`, `tagall`, `hidetag/h`, `jeslyn`, enam alias image enhancer, empat alias sticker watermark, `reactch`, dan event welcome.

Tidak ada command aman yang teridentifikasi tertinggal di dispatcher lama. `eval`, `exec`/shell dari pesan dan blok kode arbitrer sengaja tidak dimigrasikan. Perilaku yang diperketat/diubah: `.get` dan media hanya mengambil IP publik dengan request DNS-pinned/no-redirect; welcome teks mendukung join/leave/promote/demote; quoted hidetag diteruskan beserta mention; `tagall` menuntut admin grup; TTS hanya berjalan bila diminta dan kredensial layanan tersedia. API pihak ketiga tetap dapat berubah.

## Dependency dan konfigurasi

Baileys dipatok ke `@itsliaaa/baileys@0.4.4`; manifest/lockfile diperbarui, versi `ws` dan `@napi-rs/image` dipatok untuk runtime/media, serta `minimatch` transitif mendapat override versi perbaikan. Versi dependency rinci ada di `package.json` dan `package-lock.json`. Node minimum ditetapkan `>=20`, CommonJS tetap digunakan dan paket Baileys ESM dimuat melalui dynamic import.

Konfigurasi rahasia berpindah ke `.env` berbasis `.env.example`; owner/pairing/config TTS tidak ditulis dalam source. Session directory diproteksi `0700`, file auth menjadi `0600`, symlink ditolak, storage membatasi path ke root yang diizinkan, dan file sticker sementara diberi izin privat serta dibersihkan setelah pengiriman.

## Perbaikan keamanan dan stabilitas

- Request HTTP(S) memvalidasi seluruh jawaban DNS, menolak alamat privat/reserved, mengikat koneksi ke IP publik tervalidasi, menolak redirect dan membatasi waktu/byte. `.get`, helper media, dan downloader memakai jalur aman.
- Menghapus remote `eval`/`exec`; voice changer memakai executable FFmpeg terpaket dan argumen tetap melalui `spawn`.
- Permission owner/group/private/admin/public/self, rate limit per pengirim, batas concurrency command/event, deduplikasi dan error boundary per plugin.
- Reconnect memakai backoff/batas percobaan; initial socket menggunakan single-flight agar tidak membuat socket paralel.
- Logger meredaksi token, API key, Authorization/Bearer, Cookie, pairing code, buffer dan secret field.
- Loader mengisolasi plugin tidak valid; alias/command bentrok ditolak saat startup.

## Pengujian: berhasil diuji

Quality gate terakhir dijalankan pada Node.js `v22.23.4`:

- `npm test`: **31 lulus, 0 gagal**. Mencakup loader nested/invalid, duplicate/alias/disable, parser case-insensitive dan args, non-command/body kosong, permission owner/admin/group/private/self, pairing/config update, socket single-flight, reconnect transient/logout, file session/storage, batas byte response, safe URL, rate/concurrency, dan integrasi mock `messages.upsert → context → dispatcher → reply`.
- `npm run check`: lulus untuk entrypoint, `src/`, `plugins/`, dan `start/lib/`.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerability.
- Smoke load: 24 plugin / 52 command; Baileys named exports tersedia.
- Smoke HTTP publik DNS-pinned: `https://example.com/` mengembalikan HTTP 200; tidak memakai akun WhatsApp.
- `git diff --check`: lulus.

## Belum diuji / batasan

- Tidak ada pairing, login, atau koneksi WhatsApp nyata; tes event dan socket menggunakan mock sebagaimana disyaratkan. Lakukan uji terkontrol dengan akun uji operator sebelum deploy.
- Node 20 tidak tersedia pada sesi ini; minimum versi diturunkan dari engine dependency, sedangkan tes aktual memakai Node 22.23.4.
- Timeout request diterapkan pada transport; suite otomatis memverifikasi batas byte dan safe URL, sedangkan request HTTP aktual yang dilakukan di smoke test adalah endpoint publik yang berhasil, bukan timeout/redirect.
- Sejumlah layanan AI/downloader pihak ketiga tidak dapat dijamin tersedia permanen.
- Credential SMTP yang tertanam di baseline telah dihapus dari working tree, tetapi riwayat penuh tidak dipindai karena checkout dangkal. Rotasi credential dan scan secret pada clone penuh tetap diperlukan.
- Branch pengembangan: `refactor/plugin-architecture`. Commit implementasi: `b64183d1322e9e62238eccf5afc2aa3ac7ca721a`. Pull request terbuka: https://github.com/nhebotx-md/basebot/pull/1.

## Cara menjalankan

1. Gunakan Node.js 20+; salin `.env.example` ke `.env` dan atur `OWNER_NUMBERS`, `PAIRING_PHONE` serta konfigurasi yang diperlukan.
2. Jalankan `npm ci` lalu `npm start`.
3. Untuk pemeriksaan tanpa WhatsApp: `npm test`, `npm run check`, dan `npm audit --omit=dev --audit-level=high`.
