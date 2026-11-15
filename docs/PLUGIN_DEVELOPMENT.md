# Pengembangan Plugin

Buat satu berkas CommonJS untuk satu tanggung jawab di kategori yang sesuai, misalnya `plugins/utility/example.js`. Ikuti kontrak pada [PLUGIN_API.md](PLUGIN_API.md). Loader menelusuri direktori secara rekursif dan deterministik, mengabaikan file/direktori tersembunyi serta dependency, dan mengisolasi kesalahan per berkas.

Jangan memindai folder dari handler pesan. Registry sudah menyediakan `getByCommand`, `list`, `categories`, dan `listByCategory`. Menu bawaan dibentuk langsung dari registry. `.menu` merotasi empat tema secara otomatis (showcase, terminal, minimal, dan premium) pada setiap pemanggilan. `.catmenu <kategori>` memakai layout kontekstual: control center untuk owner/system, studio untuk media/download, desk untuk AI/search, hub untuk group/user, katalog editorial untuk kategori konten, dan directory sebagai fallback. Semua layout menampilkan command, alias, deskripsi, dan usage jika tersedia. Plugin yang gagal dimuat, dinonaktifkan, atau tidak dapat diakses oleh pengguna tidak ditampilkan. Pemilihan tema hanya berada di memori runtime dan tidak menambah dependency atau mengubah database. Command `menu` dan `catmenu` dicadangkan untuk menu bawaan. Untuk pengujian, letakkan unit test di `tests/unit/`; tidak perlu koneksi WhatsApp untuk menguji parser, registry, dispatcher, atau permission.

Gunakan `ctx.reply`, `ctx.sendMessage`, `ctx.react`, dan `ctx.services` daripada implementasi transport sendiri. Validasi input dan ukuran media, pasang timeout untuk jaringan, batasi concurrency untuk operasi berat, serta gunakan `try/finally` untuk cleanup. Jangan log credential, token, pairing code, isi media, atau konten pribadi.

## Hak akses dan identitas

`isOwner` hanya diberikan jika identitas pengirim yang sudah dinormalisasi cocok dengan salah satu nomor pada `OWNER_NUMBERS` di `.env` (termasuk identitas PN yang berhasil dipetakan dari LID). Status admin grup, pesan `fromMe`, nama profil, dan jabatan grup tidak pernah menjadi pengganti identitas owner. Pastikan `OWNER_NUMBERS` berisi nomor WhatsApp pemilik bot dalam format kode negara + nomor, tanpa `+` atau spasi, dipisahkan koma jika lebih dari satu.

Gunakan permission berdasarkan ruang dan peran secara terpisah:

- `ownerOnly: true`: hanya nomor owner bot yang terdaftar. Admin grup tetap ditolak, baik di grup maupun chat pribadi. Kategori plugin bernama `owner` otomatis diperlakukan sebagai owner-only meskipun flag terlupa.
- `groupOnly: true`: command hanya dapat dijalankan di grup. Anggota grup dapat menggunakannya kecuali ditambah pembatas peran. Kategori plugin bernama `group` otomatis dibatasi ke grup dan hanya dapat dipakai admin grup atau owner bot.
- `groupOnly: true, adminOnly: true`: hanya admin grup dan owner bot yang dapat menjalankannya di grup. Owner dapat melewati syarat admin grup secara default.
- `privateOnly: true`: hanya dapat dijalankan di chat pribadi.
- `botAdminOnly: true`: bot harus terdeteksi sebagai admin grup.

`adminOnly` juga mensyaratkan konteks grup. Untuk command yang benar-benar khusus owner, gunakan `ownerOnly`, jangan mengandalkan `adminOnly`. Jika metadata grup gagal diambil, status admin dan bot-admin dianggap tidak valid (fail-closed). Menu memakai aturan permission yang sama, sehingga plugin owner-only hanya muncul untuk owner terverifikasi dan plugin group-only hanya muncul di konteks grup. Jangan menggunakan `eval`, `exec`, atau interpolasi input ke shell. Operasi file harus memakai service storage atau membatasi `path.resolve` ke root yang diizinkan.

Reload tersedia melalui `reloadPlugins()` untuk tooling development; production memakai plugin yang sudah dimuat saat startup. Jangan reload plugin saat pesan sedang dieksekusi tanpa mekanisme drain pada aplikasi produksi.
