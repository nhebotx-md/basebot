# Arsitektur BASEBOT

## Alur command

`messages.upsert` diproses satu per satu oleh `messages-upsert.js`; pesan Baileys dibuka dari wrapper ephemeral/view-once lalu dinormalisasi. Parser membaca prefix dan args. Context builder mengambil metadata grup hanya ketika command terdaftar meminta permission grup/admin, menormalkan identitas, serta menyediakan service bersama. Dispatcher melakukan deduplikasi berdasarkan message ID, mencari plugin pada registry Map, memeriksa permission, lalu menjalankan `execute(ctx)` dalam error boundary.

Plugin event seperti `group-participants.update` ditangani event dispatcher terpisah. Pesan biasa yang bukan command tidak dipaksa menjalankan command handler.

## Batas tanggung jawab

`src/integrations/whatsapp/client.js` mengimplementasikan adapter provider Baileys, termasuk pembuatan socket dan transport/media dasar. `src/core/client/create-client.js` hanya mempertahankan compatibility facade untuk import lama. `src/core/connection` menerima fungsi `createClient` dari bootstrap dan mengelola pairing, reconnect dengan exponential backoff terbatas, serta shutdown tanpa mengimpor Baileys secara langsung. Adapter menormalkan kode lifecycle menjadi `client.lifecycleReasons`. `src/core/events` memasang listener terpisah. `src/core/messaging` menangani normalisasi, parsing, context, dan dispatch. `src/core/plugins` menangani validasi, registry, serta loading. `src/core/security` menangani permission dan URL. `src/core/services` menampung logger, message/media, dan storage.

Fitur command tinggal di `plugins/`; core tidak mengetahui business logic fitur. Konfigurasi dimuat sekali dari environment dan `.env`, sementara session, log, dan file sementara terpisah dari source.

## Kegagalan dan batas

Gagal load/validasi sebuah plugin hanya melewati plugin tersebut. Error plugin command/event hanya tercatat di logger dan tidak menghentikan event emitter. Metadata grup gagal berarti akses admin ditolak. Reconnect tidak dilakukan setelah status logout, jumlah percobaan dibatasi delapan kali, dan timer tidak ditumpuk. Koneksi jaringan memiliki timeout dan batas ukuran untuk command `.get` serta service media.
