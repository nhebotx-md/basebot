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


## Backup dan restore database

BASEBOT menyediakan backup snapshot terpisah dari file database aktif melalui `BackupService`. Snapshot disimpan di `data/database/backups/` (atau direktori database yang ditentukan pada konfigurasi lokal), dengan permission direktori `0700` dan file `0600`. Snapshot memuat `meta.json`, `users.json`, `groups.json`, dan `plugins.json`, beserta manifest berisi ukuran dan SHA-256 setiap file.

- Backup otomatis harian dibuat saat runtime dimulai jika belum ada backup otomatis pada tanggal UTC tersebut. Pemeriksaan diulang setiap enam jam.
- Retensi default adalah 14 snapshot terbaru. Snapshot lama dihapus setelah backup baru berhasil dibuat.
- Backup manual: `.backup create`.
- Daftar snapshot: `.backup list`.
- Verifikasi integritas: `.backup verify <ID>`.
- Restore meminta dua langkah: `.backup restore <ID>` untuk memeriksa dan menampilkan konfirmasi, lalu `.backup restore confirm <ID>` untuk menjalankan.
- Sebelum restore, BASEBOT membuat safety backup dari kondisi database aktif.
- Restore memvalidasi manifest, ukuran, checksum SHA-256, JSON, dan versi skema sebelum menulis database. Penulisan snapshot dilakukan melalui antrean database; file disiapkan lebih dulu, lalu dipindahkan secara atomik. Jika pergantian file gagal, sistem mencoba mengembalikan file sebelumnya.
- Restore hanya mencakup database JSON. Sesi WhatsApp, `settings.js`, `.env`, file media sementara, dan log tidak termasuk dalam snapshot.

Backup disimpan secara lokal di perangkat/server yang menjalankan bot. Backup lokal bukan perlindungan terhadap kerusakan atau kehilangan perangkat. Salin direktori `data/database/backups/` secara berkala ke media lain yang terenkripsi dan aksesnya dibatasi. Jangan mengunggah snapshot yang berisi profil, nomor WhatsApp, statistik, atau data grup ke repositori publik.

Restore mengganti data database aktif dan dapat mengembalikan profil, pengaturan grup, serta status plugin ke waktu snapshot dibuat. Pastikan ID dan waktu backup benar sebelum mengonfirmasi. Jangan jalankan beberapa instance BASEBOT pada direktori database yang sama.
