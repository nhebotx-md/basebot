# BASEBOT

BASEBOT adalah framework bot WhatsApp CommonJS yang menempatkan command di `plugins/` dan fondasi transport, permission, serta eksekusi di `src/`. Sistem plugin memuat metadata tervalidasi sekali saat startup dan menjalankan tiap plugin melalui dispatcher terpusat.

## Memulai

Gunakan Node.js 20 atau lebih baru. Jalankan `npm ci`, salin `.env.example` menjadi `.env`, lalu atur setidaknya `OWNER_NUMBERS` dan `PAIRING_PHONE` menggunakan angka dengan kode negara. Setelah itu jalankan `npm start`. Pairing code yang dihasilkan Baileys hanya dicetak ke terminal saat sesi belum terdaftar; jangan mengatur kode tetap melalui `PAIRING_CODE`. Jangan membagikan `.env`, `session/`, log yang berisi identitas chat, atau data autentikasi.

Jalankan `npm test` untuk unit test tanpa menghubungkan WhatsApp dan `npm run check` untuk pemeriksaan sintaks. Dependency Baileys dikunci pada `@itsliaaa/baileys@0.4.4`; dependency tree dikunci di `package-lock.json`.

Logger terminal memakai tema warna BASEBOT dengan banner startup, ringkasan plugin, panel status koneksi, dan aktivitas command. `LOG_FORMAT=pretty` adalah format terminal standar; gunakan `LOG_FORMAT=json` untuk record JSON terstruktur. `LOG_COLOR=auto` mengikuti TTY dan `NO_COLOR`, atau pilih `always`/`never`. Kartu aktivitas hanya memuat nama command/plugin, jenis chat, dan durasi; identitas dan isi pesan tidak ditampilkan.

## Struktur

- `src/core/client` dan `src/core/connection`: socket, pairing, reconnect, dan lifecycle.
- `src/core/events`: handler event terpisah.
- `src/core/messaging`: normalisasi pesan, parser, context, dan dispatcher.
- `src/core/plugins`: validasi, registry, serta loader.
- `src/core/security`: permission dan validasi URL.
- `src/core/services`: pesan, media, storage, dan logger.
- `plugins/<kategori>/*.js`: implementasi command dan plugin event.
- `docs/`: inventaris, rancangan, API, migrasi, dan kompatibilitas.

Lihat [Panduan pengembangan plugin](docs/PLUGIN_DEVELOPMENT.md) sebelum menambahkan fitur. Evaluasi kode dan eksekusi shell melalui pesan WhatsApp sengaja dihapus.

## Troubleshooting

- Jika pairing code tidak muncul, pastikan `PAIRING_PHONE` berisi angka dengan kode negara; code hanya diminta untuk sesi yang belum terdaftar. Hapus nilai lama `PAIRING_CODE` dari `.env` bila ada; kode kustom diabaikan dan kode valid dihasilkan Baileys. Jangan menghapus `SESSION_DIR` sebagai langkah pertama karena session adalah kredensial login.
- Status `515 / restartRequired` setelah pairing dapat merupakan langkah normal: BASEBOT menunggu kredensial tersimpan, membuka socket baru, lalu harus menerima status `open`. Jangan hentikan proses setelah log reconnect dijadwalkan. Jika berulang, cek log terstruktur untuk `credentialsRegistered`, `isNewLogin`, dan alasan/status disconnect.
- Jika log menyatakan ada plugin yang dilewati, periksa `file`, `stage`, dan stack error di record JSON. Setelah deployment jalankan `npm ci` dari direktori BASEBOT agar dependency sesuai lockfile; perbaiki error spesifik plugin, bukan hanya mengabaikan jumlah plugin yang berkurang.
- Jika command media gagal, verifikasi konektivitas endpoint pihak ketiga serta limit ukuran/timeout. Sticker dan voice changer memakai binary FFmpeg dari dependency; bila binari voice changer hilang, plugin tetap dimuat dan command memberi instruksi install.
- Pastikan proses dapat membuat `SESSION_DIR` dan `TEMP_DIR`; session harus direktori privat dan symlink tidak diizinkan.

## Sticker REST API

Plugin `sticker-rest-api` menambahkan `.stickerapi brat <teks>` untuk Brat statis dan `.stickerapi animated <teks>` untuk animasi. Output API bukan sticker WhatsApp siap pakai; BASEBOT memvalidasi signature PNG/GIF, membatasi respons hingga 8 MiB dan timeout 15 detik, lalu mengonversi media memakai FFmpeg/WebP serta metadata pack. Input dibatasi 300 karakter dan dikirim ke penyedia pihak ketiga, jadi jangan gunakan teks rahasia/pribadi.

Siputzx (`api.siputzx.my.id`) adalah provider utama. Host alternate Asepharyana (`scraper.asepharyana.my.id`) berbeda dari URL dokumentasi `asepharyana.cloud` yang diberikan pengguna, sehingga fallback itu **nonaktif secara default**; aktifkan hanya bila Anda menerima host alternate dengan `STICKER_API_ASEPHARYANA_ENABLED=true`. Temuan, sumber, dan batas verifikasi ada di [audit REST API sticker](docs/STICKER_API_AUDIT.md).

## Quote Sticker `.qc`

Gunakan `.qc pink Hai semuanya!` untuk membuat quote sticker dengan warna latar, atau balas pesan dengan `.qc pink`. Plugin menerima warna yang tercantum pada bantuan dan kode hex `#RRGGBB`; teks dibatasi 80 karakter. Request POST ke Siputzx memakai HTTPS dengan DNS pinning, tanpa redirect, serta batas timeout dan ukuran. Avatar profil diunduh lewat transport publik yang tervalidasi dan dikirim sebagai data URL; teks quote dan avatar diproses oleh API pihak ketiga, jadi jangan kirim konten rahasia.
