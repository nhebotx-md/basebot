# Pengembangan Plugin

Buat satu berkas CommonJS untuk satu tanggung jawab di kategori yang sesuai, misalnya `plugins/utility/example.js`. Ikuti kontrak pada [PLUGIN_API.md](PLUGIN_API.md). Loader menelusuri direktori secara rekursif dan deterministik, mengabaikan file/direktori tersembunyi serta dependency, dan mengisolasi kesalahan per berkas.

Jangan memindai folder dari handler pesan. Registry sudah menyediakan `getByCommand`, `list`, `categories`, dan `listByCategory`. Menu bawaan dibentuk langsung dari registry. `.menu` merotasi empat tema secara otomatis (showcase, terminal, minimal, dan premium) pada setiap pemanggilan. `.catmenu <kategori>` memakai layout kontekstual: control center untuk owner/system, studio untuk media/download, desk untuk AI/search, hub untuk group/user, katalog editorial untuk kategori konten, dan directory sebagai fallback. Semua layout menampilkan command, alias, deskripsi, dan usage jika tersedia. Plugin yang gagal dimuat, dinonaktifkan, atau tidak dapat diakses oleh pengguna tidak ditampilkan. Pemilihan tema hanya berada di memori runtime dan tidak menambah dependency atau mengubah database. Command `menu` dan `catmenu` dicadangkan untuk menu bawaan. Untuk pengujian, letakkan unit test di `tests/unit/`; tidak perlu koneksi WhatsApp untuk menguji parser, registry, dispatcher, atau permission.

Gunakan `ctx.reply`, `ctx.sendMessage`, `ctx.react`, `ctx.progress`, dan `ctx.services` daripada implementasi transport sendiri. Untuk operasi yang memerlukan waktu, tampilkan tahapan proses lewat `ctx.progress.start()` dan `ctx.progress.update()`; dispatcher mengedit satu pesan status dan otomatis menandai selesai/gagal. Lihat [Plugin Process Feedback](./PLUGIN_PROCESS_FEEDBACK.md). Validasi input dan ukuran media, pasang timeout untuk jaringan, batasi concurrency untuk operasi berat, serta gunakan `try/finally` untuk cleanup. Jangan log credential, token, pairing code, isi media, atau konten pribadi.

## Registrasi, role, dan akses pengguna

Pengguna biasa yang menjalankan command di grup wajib mendaftar dengan `.daftar nama`. Profil yang otomatis dibuat dari aktivitas pesan belum dianggap terdaftar. Registrasi mengubah status akun menjadi aktif dan memberi role awal `user`; status ini disimpan di `users.json`. Command registrasi adalah pengecualian agar pengguna yang belum terdaftar tetap dapat mendaftar. Owner bot dan command owner-only tetap mengikuti identitas `OWNER_NUMBERS`.

Role aplikasi yang tersedia adalah `user`, `premium`, dan `moderator`. Role `owner` tidak dapat diberikan lewat database karena hak owner hanya berasal dari konfigurasi identitas. Owner dapat mengelola akun dengan `.setrole 628xxxx premium`, memberi akses khusus dengan `.grantakses 628xxxx command:namacommand` atau `.grantakses 628xxxx kategori:slug`, dan mencabutnya dengan `.cabutakses` menggunakan format target yang sama. Target harus sudah terdaftar.

Untuk membatasi plugin berdasarkan role, gunakan `permissions: { roles: ['premium', 'moderator'] }` atau `permissions: { minRole: 'premium' }`. Untuk akses yang harus diberikan secara eksplisit oleh owner, gunakan `permissions: { accessRequired: true }`; grant command/kategori pada profil pengguna akan membuka fitur tersebut. Grant tidak pernah melewati pembatas owner-only, group-only, admin grup, atau bot-admin. Menu dan eksekusi command menggunakan pemeriksaan yang sama.

## Hak akses dan identitas

`isOwner` hanya diberikan jika identitas pengirim yang sudah dinormalisasi cocok dengan salah satu nomor pada `OWNER_NUMBERS` di `.env` (termasuk identitas PN yang berhasil dipetakan dari LID). Status admin grup, pesan `fromMe`, nama profil, dan jabatan grup tidak pernah menjadi pengganti identitas owner. Pastikan `OWNER_NUMBERS` berisi nomor WhatsApp pemilik bot dalam format kode negara + nomor, tanpa `+` atau spasi, dipisahkan koma jika lebih dari satu.

Gunakan permission berdasarkan ruang dan peran secara terpisah:

- `ownerOnly: true`: hanya nomor owner bot yang terdaftar. Admin grup tetap ditolak, baik di grup maupun chat pribadi. Kategori plugin bernama `owner` otomatis diperlakukan sebagai owner-only meskipun flag terlupa.
- `groupOnly: true`: command hanya dapat dijalankan di grup. Anggota grup dapat menggunakannya kecuali ditambah pembatas peran. Kategori plugin bernama `group` otomatis dibatasi ke grup dan hanya dapat dipakai admin grup atau owner bot. Owner bot selalu dapat melewati syarat admin untuk kategori ini; `ownerAdminBypass: false` tidak menurunkan hak owner pada kategori `group`. Pengecualian: plugin yang secara eksplisit memakai `ownerOnly: true` hanya dapat dipakai owner bot, termasuk dari chat pribadi.
- `groupOnly: true, adminOnly: true`: hanya admin grup dan owner bot yang dapat menjalankannya di grup. Owner dapat melewati syarat admin grup secara default.
- `privateOnly: true`: hanya dapat dijalankan di chat pribadi.
- `botAdminOnly: true`: bot harus terdeteksi sebagai admin grup.

`adminOnly` juga mensyaratkan konteks grup. Untuk command yang benar-benar khusus owner, gunakan `ownerOnly`, jangan mengandalkan `adminOnly`. Jika metadata grup gagal diambil, status admin dan bot-admin dianggap tidak valid (fail-closed). Menu memakai aturan permission yang sama, sehingga plugin owner-only hanya muncul untuk owner terverifikasi dan plugin group-only hanya muncul di konteks grup. Jangan menggunakan `eval`, `exec`, atau interpolasi input ke shell. Operasi file harus memakai service storage atau membatasi `path.resolve` ke root yang diizinkan.

Reload plugin runtime tersedia melalui Plugin Manager dan auto reload staged; registry aktif dipertahankan jika kandidat tidak lolos validasi.


## Penanganan error plugin

Dispatcher membungkus pemanggilan `plugin.execute(ctx)`. Jika plugin melempar exception, bot membuat ID referensi unik, mencatat detail exception ke logger, lalu mengirim laporan terformat melalui `ctx.reply()`. Laporan mencakup nama plugin, command, tahap, tipe error, detail singkat yang telah disamarkan, dugaan penyebab, dan langkah pemeriksaan. Stack trace lengkap tetap berada di log server, bukan di chat.

Diagnostik mengenali error koneksi/timeout, HTTP 401/403, 404, 429, 5xx, file/permission, dependency FFmpeg yang hilang, serta error JavaScript umum. Jangan menambahkan token, cookie, pairing code, atau data pengguna ke pesan error secara manual. ID referensi dari chat digunakan untuk menemukan record terkait di log.

Plugin event yang gagal tidak memiliki jaminan konteks balasan chat. Kegagalannya dicatat dengan nama plugin, event, tahap, ID referensi, exception, dan hasil diagnosis di log; dispatcher melanjutkan pemrosesan plugin event lain.
