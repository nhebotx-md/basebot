# JSON Database

BASEBOT memakai JSON sebagai database awal tanpa dependency eksternal. Data runtime disimpan di \`data/database/\` dan direktori tersebut diabaikan oleh Git karena berisi data pengguna.

## File

- \`meta.json\`: versi skema database dan metadata migrasi.
- \`users.json\`: profil, EXP, level, coins, dan statistik pengguna.
- \`groups.json\`: pengaturan dan statistik grup.
- \`plugins.json\`: daftar plugin yang dinonaktifkan.

Setiap collection menggunakan envelope \`{ schemaVersion, updatedAt, data }\`. File lama yang masih berupa object JSON biasa otomatis dibungkus ke skema awal (versi 1) saat startup.

## Keamanan dan konsistensi tulis

- Semua perubahan melalui \`DatabaseService.update()\` dan antrean tulis serial.
- File ditulis ke file sementara, di-fsync, lalu dipindahkan dengan rename atomik.
- Salinan terakhir sebelum penggantian disimpan sebagai file \`.bak\`.
- File JSON yang rusak dicoba dipulihkan dari backup terakhir. Jika backup tidak tersedia, startup dihentikan agar data tidak tertimpa dengan object kosong.
- Plugin harus memakai \`ctx.services.users\`, \`ctx.services.groups\`, atau \`ctx.services.database\`, bukan membaca/menulis file langsung.

## Profil dan EXP

EXP otomatis bertambah 5 untuk pesan pengguna yang memenuhi cooldown 60 detik. Atur melalui:

\`\`\`env
DATABASE_DIR=./data/database
EXP_PER_MESSAGE=5
EXP_COOLDOWN_MS=60000
\`\`\`

Nilai EXP 0 menonaktifkan pemberian EXP otomatis. Level dihitung dari total EXP dengan rumus \`floor(sqrt(exp / 100)) + 1\`. Coins tidak diberikan otomatis; plugin dapat menggunakan \`users.addCoins()\`, \`users.spendCoins()\`, dan \`users.addExp()\`.

Command \`.profile\` atau \`.me\` menampilkan profil pengguna. Statistik pesan, command, dan aktivitas pesan grup diperbarui otomatis.

## Pemeriksaan rilis

Sebelum PR digabung, jalankan `npm test` dan `npm run check` pada Node.js 22 atau 24, lalu lakukan smoke test dengan akun WhatsApp uji.

## Batas penggunaan

JSON cocok untuk satu proses bot dan data awal hingga menengah. Karena satu collection ditulis ulang sebagai satu file, instalasi dengan trafik sangat tinggi atau beberapa proses bot yang berbagi direktori harus beralih ke database transaksional. Jangan menjalankan dua instance BASEBOT pada direktori database yang sama.


## Automatic Backup & Disaster Recovery

BASEBOT menjalankan \`BackupService\` sebagai bagian dari lifecycle runtime. Fitur ini bukan hanya perintah manual: sebelum database diinisialisasi, sistem memeriksa konsistensi file aktif dan dapat melakukan pemulihan otomatis dari snapshot lengkap yang lolos verifikasi.

### Kebijakan backup otomatis

- Snapshot baseline dibuat saat startup pertama setelah database siap.
- Snapshot otomatis berikutnya dibuat setiap 6 jam secara default. Interval dan retensi dapat dikonfigurasi di \`settings.js\` melalui \`backups.intervalHours\` (1–168 jam) dan \`backups.retention\` (2–100 snapshot).
- Setiap snapshot memuat \`meta.json\`, \`users.json\`, \`groups.json\`, dan \`plugins.json\`. Manifest menyimpan ukuran byte dan SHA-256 tiap file.
- Snapshot dibuat di direktori staging, lalu dipublikasikan dengan rename setelah seluruh file dan manifest berhasil ditulis. File memakai permission \`0600\`; direktori backup \`0700\`.
- Retensi hanya memangkas snapshot yang lolos validasi. Snapshot rusak tidak dianggap sebagai recovery point dan tidak dipromosikan sebagai backup valid.
- Backup manual tetap tersedia melalui \`.backup create\`, \`.backup list\`, \`.backup verify <ID>\`, dan \`.backup status\`.

Contoh konfigurasi:

\`\`\`js
backups: {
  retention: 14,
  intervalHours: 6
}
\`\`\`

### Automatic Disaster Recovery

Saat startup, BASEBOT melakukan preflight terhadap empat file database sebelum \`DatabaseService.init()\` mengubah atau memigrasikan file:

1. Database yang benar-benar baru, tanpa file database maupun snapshot, dikenali sebagai instalasi baru dan diinisialisasi kosong.
2. Database yang sehat dilanjutkan seperti biasa.
3. File hilang sebagian, JSON rusak, atau struktur collection tidak valid dianggap sebagai kerusakan. Versi skema yang lebih baru bukan kerusakan dan tidak akan ditimpa oleh versi aplikasi yang lebih lama.
4. Sistem memeriksa snapshot dari yang terbaru, memvalidasi manifest, ukuran, SHA-256, JSON, dan kompatibilitas skema. Snapshot yang rusak dilewati.
5. Snapshot valid pertama dipulihkan sebelum database aktif diinisialisasi. File yang ditemukan sebelum recovery disalin ke \`recovery-quarantine/\` untuk pemeriksaan manual.
6. Jika tidak ada snapshot valid, startup dihentikan dengan mode fail-closed. Sistem tidak membuat database kosong dan tidak menimpa data dengan tebakan.

Database kosong tidak otomatis dianggap rusak. Namun, jika file database hilang sementara snapshot masih tersedia, kondisi tersebut diperlakukan sebagai kehilangan data dan recovery dijalankan.

Setelah koneksi WhatsApp tersedia, BASEBOT mengirim notifikasi recovery atau kegagalan backup kepada nomor owner yang dikonfigurasi. Jika startup berhenti karena tidak ada recovery point, periksa log terminal, pulihkan snapshot eksternal, lalu jalankan ulang bot. Recovery tidak dapat menjamin pemberitahuan WhatsApp saat proses startup memang harus dihentikan dan koneksi belum terbentuk.

### Restore manual dan keselamatan data

- \`.backup restore <ID>\` memverifikasi snapshot dan menampilkan konfirmasi.
- \`.backup restore confirm <ID>\` membuat safety backup dari database aktif, lalu menjalankan restore.
- Restore manual selalu memerlukan konfirmasi owner. Tidak ada restore otomatis hanya karena database kosong atau karena owner menjalankan command yang salah.
- Snapshot otomatis hanya dipakai untuk recovery startup setelah kerusakan terdeteksi secara struktural dan snapshot lolos seluruh pemeriksaan.
- Restore mencakup database JSON saja. Sesi WhatsApp, \`settings.js\`, \`.env\`, media sementara, dan log tidak termasuk.
- Backup lokal tidak melindungi dari kehilangan perangkat. Salin direktori \`data/database/backups/\` secara berkala ke media lain yang terenkripsi dan aksesnya dibatasi. Jangan mengunggah snapshot berisi profil, nomor WhatsApp, statistik, atau data grup ke repositori publik.

JSON database ditujukan untuk satu proses bot. Jangan menjalankan dua instance BASEBOT pada direktori database yang sama.
\n\n## Data Finance\n\nFinance Manager tidak menambah collection atau file database baru. Setiap profil pada `users.json` dapat memiliki properti `finance` yang berisi transaksi, anggaran, utang, target tabungan, dan jadwal transaksi rutin. Data tetap diproses melalui `DatabaseService.update('users', ...)`, sehingga antrean tulis serial, penulisan atomik, backup `.bak`, snapshot otomatis, dan recovery yang sudah ada tetap berlaku. Backup database mencakup seluruh data finance karena namespace ini berada di dalam `users.json`. Akses data harus selalu memakai JID pengirim yang sudah dinormalisasi; jangan menambahkan command untuk membaca keuangan JID lain.\n