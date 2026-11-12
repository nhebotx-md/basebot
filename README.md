# BASEBOT

BASEBOT adalah framework bot WhatsApp CommonJS yang menempatkan command di `plugins/` dan fondasi transport, permission, serta eksekusi di `src/`. Sistem plugin memuat metadata tervalidasi sekali saat startup dan menjalankan tiap plugin melalui dispatcher terpusat.

## Memulai

Gunakan Node.js 20 atau lebih baru. Jalankan `npm ci`, salin `.env.example` menjadi `.env`, lalu atur setidaknya `OWNER_NUMBERS` dan `PAIRING_PHONE` menggunakan angka dengan kode negara. Setelah itu jalankan `npm start`. Pairing code hanya dicetak ke terminal saat sesi belum terdaftar. Jangan membagikan `.env`, `session/`, log yang berisi identitas chat, atau data autentikasi.

Jalankan `npm test` untuk unit test tanpa menghubungkan WhatsApp dan `npm run check` untuk pemeriksaan sintaks. Dependency Baileys dikunci pada `@itsliaaa/baileys@0.4.4`; dependency tree dikunci di `package-lock.json`.

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

- Jika pairing code tidak muncul, pastikan `PAIRING_PHONE` berisi angka dengan kode negara; code hanya diminta untuk sesi yang belum terdaftar. Jangan menghapus `SESSION_DIR` sebagai langkah pertama karena session adalah kredensial login.
- Jika startup berhenti setelah banyak reconnect, periksa koneksi jaringan dan log status. Reconnect memiliki backoff dan batas percobaan; restart manual tidak mengubah session kecuali direktori tersebut dihapus operator.
- Jika command media gagal, verifikasi konektivitas endpoint pihak ketiga serta limit ukuran/timeout. Sticker dan voice changer memakai binary FFmpeg yang dipaketkan bersama dependency.
- Pastikan proses dapat membuat `SESSION_DIR` dan `TEMP_DIR`; session harus direktori privat dan symlink tidak diizinkan.
