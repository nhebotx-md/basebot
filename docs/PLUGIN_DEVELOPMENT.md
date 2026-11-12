# Pengembangan Plugin

Buat satu berkas CommonJS untuk satu tanggung jawab di kategori yang sesuai, misalnya `plugins/utility/example.js`. Ikuti kontrak pada [PLUGIN_API.md](PLUGIN_API.md). Loader menelusuri direktori secara rekursif dan deterministik, mengabaikan file/direktori tersembunyi serta dependency, dan mengisolasi kesalahan per berkas.

Jangan memindai folder dari handler pesan. Registry sudah menyediakan `getByCommand`, `list`, `categories`, dan `listByCategory`. Menu dibentuk otomatis dari plugin aktif. Untuk pengujian, letakkan unit test di `tests/unit/`; tidak perlu koneksi WhatsApp untuk menguji parser, registry, dispatcher, atau permission.

Gunakan `ctx.reply`, `ctx.sendMessage`, `ctx.react`, dan `ctx.services` daripada implementasi transport sendiri. Validasi input dan ukuran media, pasang timeout untuk jaringan, batasi concurrency untuk operasi berat, serta gunakan `try/finally` untuk cleanup. Jangan log credential, token, pairing code, isi media, atau konten pribadi.

Command yang hanya untuk owner harus menyatakan `ownerOnly: true`; command admin grup harus menggunakan `groupOnly` dan `adminOnly`. Jangan mempercayai metadata grup yang tidak tersedia. Jangan menggunakan `eval`, `exec`, atau interpolasi input ke shell. Operasi file harus memakai service storage atau membatasi `path.resolve` ke root yang diizinkan.

Reload tersedia melalui `reloadPlugins()` untuk tooling development; production memakai plugin yang sudah dimuat saat startup. Jangan reload plugin saat pesan sedang dieksekusi tanpa mekanisme drain pada aplikasi produksi.
