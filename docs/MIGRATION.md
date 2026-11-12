# Migrasi BASEBOT 1.x → 2.x

## Perubahan penting

- `message.js` dan switch/case lama dihapus. Semua command berada di `plugins/` dan dijalankan oleh satu dispatcher.
- `settings/config.js` dan `global.*` dihapus. Salin `.env.example` ke `.env`; pindahkan nomor owner ke `OWNER_NUMBERS`, nomor pairing ke `PAIRING_PHONE`, serta konfigurasi sticker/TTS ke variabel environment terkait.
- `@whiskeysockets/baileys` yang sebelumnya ditarik dari branch GitHub tak tetap diganti dengan `@itsliaaa/baileys@0.4.4` yang dipin, sesuai sumber fork yang diminta. Jalankan `npm ci` agar lockfile dipakai.
- Data auth masih menggunakan multi-file session di `SESSION_DIR`. Jangan hapus atau commit folder tersebut.
- File sementara command owner kini berada di `TEMP_DIR` (default `storage/temp`), bukan `start/tmp`.
- Welcome tetap aktif secara default seperti konfigurasi legacy; ubah `WELCOME_ENABLED=false` bila tidak ingin pesan join/leave.
- Mode self/public adalah state runtime yang bertahan saat reconnect, tetapi tidak ditulis permanen ke disk; restart mengikuti `PUBLIC_MODE`.
- Fitur eval/exec pesan WhatsApp dihapus sepenuhnya. Tidak tersedia pengganti shell jarak jauh.

Sebelum deploy, backup session secara privat, buat `.env`, pasang Node.js 20+, install `npm ci`, jalankan `npm test` dan `npm run check`, kemudian pairing jika sesi baru. Rollback versi sebelumnya tidak akan membaca konfigurasi environment baru secara otomatis; simpan backup konfigurasi secara privat.

## Perilaku fitur saat migrasi

Semua command aman yang ditemukan pada switch dan direktori `command/` tersedia di plugin registry; daftar alias/izin lengkap tercatat di [LEGACY_INVENTORY.md](LEGACY_INVENTORY.md). Perubahan terlihat: `.tagall` menuntut admin grup termasuk owner (sesuai legacy), `.hidetag` meneruskan quoted message dengan mention grup, welcome mendukung join/leave/promote/demote tanpa kartu gambar lama, dan `.jeslyn` membuat voice hanya bila diminta serta konfigurasi TTS tersedia. Pengambilan URL `.get` sekarang hanya ke IP publik yang dipin, tanpa redirect.

Fitur eksekusi kode `eval` dan shell `exec` sengaja tidak dimigrasikan untuk mencegah remote code execution. Nilai SMTP/API/owner/pairing yang dahulu hardcoded tidak dipindahkan; masukkan ulang credential yang masih aktif ke environment secara privat dan rotasi credential lama.
