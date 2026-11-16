# Plugin Process Feedback

BASEBOT menyediakan satu API progres untuk semua command plugin. Tujuannya memberi informasi tahap kerja yang jelas tanpa memenuhi chat dengan pesan baru berulang kali.

## Cara pakai

    async execute(ctx) {
      await ctx.progress.start('Memvalidasi input', {
        detail: 'Memeriksa format dan alamat tujuan.'
      });

      const source = await resolveSource(ctx.text);
      await ctx.progress.update('Mengunduh media', {
        detail: 'Mengambil file dari provider.'
      });

      const media = await downloadMedia(source);
      await ctx.progress.update('Mengirim hasil', {
        detail: 'Media siap dikirim ke WhatsApp.'
      });

      await ctx.sendMessage(ctx.chat, { video: media }, { quoted: ctx.m.raw });
      // Dispatcher otomatis menutup progres sebagai berhasil.
    }

ctx.process adalah alias dari ctx.progress, sehingga plugin juga dapat memanggil await ctx.process('Tahap berikutnya').

## API

| Method | Kegunaan |
|---|---|
| ctx.progress.start(label, options?) | Membuka pesan status dan menampilkan tahap pertama. |
| ctx.progress.update(label, options?) | Menandai tahap sebelumnya selesai dan menampilkan tahap aktif berikutnya. |
| ctx.progress.step(label, options?) | Alias dari update. |
| ctx.progress.complete(label?) | Menandai proses berhasil secara eksplisit. |
| ctx.progress.fail(label, options?) | Menandai proses gagal jika plugin menangani error sendiri. |
| ctx.progress.isStarted() | Memeriksa apakah progres sudah dimulai. |
| ctx.progress.isFinished() | Memeriksa apakah progres sudah ditutup. |

options.detail adalah keterangan singkat yang ditampilkan di bawah tahap. Label dan detail dibatasi panjangnya serta karakter kontrol dibersihkan.

## Perilaku dispatcher

- Pesan progres pertama dikirim satu kali, lalu tahap berikutnya mengedit pesan status yang sama.
- Reaksi proses ditambahkan saat mulai, berhasil, atau gagal.
- Jika plugin.execute() selesai tanpa menutup progres, dispatcher otomatis menandai berhasil.
- Jika plugin.execute() melempar exception, dispatcher otomatis menandai gagal dan mengirim laporan diagnostik.
- Jika plugin menangani exception sendiri dan tetap return, panggil ctx.progress.fail() sebelum mengirim pesan error.
- Kegagalan pengiriman/edit pesan progres dicatat sebagai warning dan tidak menghentikan proses utama plugin.
- Plugin yang tidak memanggil API progres tetap berjalan seperti sebelumnya; tidak ada pesan status otomatis untuk command yang sangat singkat.

## Praktik baik

1. Gunakan tahap yang menjelaskan pekerjaan nyata, misalnya validasi, pencarian, request provider, download, konversi, dan pengiriman.
2. Jangan memperbarui status untuk setiap potongan kecil. Satu update per tahap bermakna sudah cukup.
3. Jangan menampilkan URL internal, API key, token, path lokal, data pribadi, atau detail exception mentah.
4. Gunakan try/finally untuk cleanup resource.
5. Jika plugin mengirim banyak item, sertakan hitungan item saat ini, misalnya Foto 2 dari 5.
6. Tandai kegagalan secara eksplisit bila error ditangkap di dalam plugin.

Status progres merupakan pesan informasi untuk pengguna, bukan bukti bahwa provider berhasil. Validasi hasil dan penanganan exception tetap wajib dilakukan.
