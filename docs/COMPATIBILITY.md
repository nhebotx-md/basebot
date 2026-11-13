# Kompatibilitas

- Runtime ditetapkan Node.js `>=22.13.0` dan aplikasi tetap menggunakan CommonJS. Package Baileys bertipe ESM; core memuatnya dengan `await import()` dari CommonJS agar tidak mengandalkan dukungan `require(ESM)` eksperimental antarversi Node.
- Baileys dipin tepat pada `@itsliaaa/baileys@0.4.4`. Perubahan versi harus ditinjau ulang terhadap API dan diikuti lockfile serta tes.
- Auth memakai `useMultiFileAuthState`; event `creds.update` disimpan serial dan di-flush sebelum reconnect/shutdown. Pairing code generated diminta setelah sinyal socket siap dan tidak memakai kode kustom.
- Disconnect `515` (`restartRequired`) bukan logout: setelah write auth selesai, BASEBOT segera membuat socket baru. Koneksi yang berhasil tetap harus berakhir di event `open`; kode pairing tercetak atau 515 saja tidak membuktikan pairing telah diterima.
- Versi protokol WhatsApp tidak diambil dinamis dari URL `master` pada setiap startup.
- Untuk thumbnail dan pemrosesan gambar, project memasang `@napi-rs/image@1.16.0`, salah satu backend yang didukung fork. `ws@8.22.2` dipasang eksplisit karena dokumentasi fork mensyaratkannya pada Node sebelum 22. QR terminal tidak digunakan.
- Quality gate dijalankan pada Node.js `v22.23.4`; minimum runtime `>=22.13.0`. Node.js di bawah 22.13 memerlukan peer dependency native `better-sqlite3` untuk jalur auth internal fork Baileys; project memakai `useMultiFileAuthState` dan tidak membutuhkan SQLite. CI memverifikasi Node.js 22 dan 24. Unit tests tidak membuat sesi/koneksi WhatsApp; uji pairing penuh memerlukan akun uji operator.

Konfirmasi ulang kompatibilitas Baileys sebelum upgrade dan hindari menampilkan credential, pairing code, atau data private saat debugging.

## Referensi API Baileys

Metadata npm yang diperiksa mencatat `@itsliaaa/baileys` versi 0.4.4, bertipe ESM, dan engine Node `>=20` (metadata package; BASEBOT menetapkan minimum lebih tinggi karena jalur dependency fork); README fork menyebut `better-sqlite3` diperlukan untuk `useSqliteAuthState` pada Node di bawah 22.13, sementara BASEBOT tidak memakai SQLite. README fork juga menunjukkan named exports `makeWASocket`, `useMultiFileAuthState`, dan request pairing code. README menyebut contoh `require()` telah diuji pada Node 24, sehingga core menggunakan dynamic import untuk kompatibilitas CJS yang lebih luas. Lihat [package npm](https://www.npmjs.com/package/@itsliaaa/baileys) dan [source fork](https://github.com/itsliaaa/baileys). Prosedur pairing—cek `creds.registered`, gunakan nomor angka berkode negara, dan minta kode setelah socket mengeluarkan QR—selaras dengan [panduan pairing Baileys](https://baileys.wiki/authentication/pairing-code). Versi paket yang dipakai dikunci di `package.json` dan `package-lock.json`. `npm audit --omit=dev` terakhir melaporkan 0 kerentanan; `minimatch` transitif `yt-search` dipatok pada versi perbaikan `3.1.4` melalui override, tanpa downgrade `yt-search`.
