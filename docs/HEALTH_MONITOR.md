# Health Monitor

## Tujuan

Health Monitor menyediakan snapshot baca-saja untuk membantu owner mendiagnosis runtime MUSE-MD. Command tidak mengubah konfigurasi, database, status plugin, sesi, atau koneksi. Health Monitor tidak mengirim request jaringan tambahan.

## Command

- .health: ringkasan status keseluruhan, uptime aplikasi, status WhatsApp/database/plugin, dan RSS memory.
- .health detail: detail versi Node/platform, PID, process uptime, load average, event-loop delay, status koneksi dan reconnect, status database, statistik plugin, memori, dan daftar checks.
- .health plugins: total plugin, aktif/nonaktif, jumlah command, dan file yang dilewati saat startup.
- .health memory: RSS, heap used/total, heap usage, external memory, dan ArrayBuffers.

Semua command berada pada kategori owner dengan ownerOnly: true. Dispatcher tetap melakukan validasi permission terpusat; plugin juga memeriksa ctx.isOwner sebagai lapisan pertahanan tambahan. Channel/Newsletter ditolak secara eksplisit.

## Status keseluruhan

- healthy: koneksi WhatsApp berada pada state open, database siap, dan tidak ada kegagalan pemuatan plugin yang tercatat saat startup.
- degraded: WhatsApp belum tersambung/terputus, atau satu/lebih file plugin dilewati saat startup, atau statistik plugin tidak dapat dibaca.
- critical: database belum diinisialisasi atau sudah ditutup.

Status tidak menyatakan bahwa semua provider pihak ketiga sedang sehat. Tidak ada health-check HTTP provider karena core saat ini tidak memiliki kontrak provider health-check yang seragam; melakukan request tersembunyi dari command diagnosis juga dapat menambah beban dan mengubah perilaku runtime.

## Sumber metrik dan batasan

- WhatsApp: state lokal yang dilacak oleh lifecycle connection manager (idle, connecting, open, reconnecting, logged-out, failed, stopped). Tidak melakukan ping jaringan.
- Database: status inisialisasi, versi skema, nama collection, dan jumlah write yang sedang antre. Path direktori dan isi collection tidak ditampilkan.
- Plugin: statistik registry/plugin manager dan perbandingan file ditemukan/dimuat saat startup. Plugin yang sengaja dinonaktifkan tidak otomatis dianggap gagal.
- Memory: snapshot process.memoryUsage(), dalam MiB (1024 × 1024 bytes).
- Load average: nilai 1/5/15 menit dari os.loadavg(); pada platform yang tidak mendukung, Node dapat mengembalikan nol.
- Event-loop delay: histogram lokal monitorEventLoopDelay dengan resolusi 20 ms. Angka dapat bernilai nol pada proses yang baru mulai dan merupakan estimasi, bukan SLA.

Data bersifat snapshot pada waktu command dipanggil. Health Monitor tidak menyimpan histori, mengirim alert, melakukan restart otomatis, atau menampilkan identitas pengguna, nomor WhatsApp, token, pairing code, path lokal, isi pesan, dan record database.

## Pengujian

Jalankan npm test dan npm run check. Unit test mencakup status sehat/degraded/critical, konversi metrik, lifecycle monitor, mode tampilan command, serta penolakan akses non-owner.
