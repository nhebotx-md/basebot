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

## Batas penggunaan

JSON cocok untuk satu proses bot dan data awal hingga menengah. Karena satu collection ditulis ulang sebagai satu file, instalasi dengan trafik sangat tinggi atau beberapa proses bot yang berbagi direktori harus beralih ke database transaksional. Jangan menjalankan dua instance BASEBOT pada direktori database yang sama.
