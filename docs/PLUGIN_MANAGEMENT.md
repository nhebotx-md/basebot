# Plugin Manager

Plugin Manager menyediakan kontrol runtime untuk owner melalui chat pribadi atau grup. Command tidak menerima operasi manajemen dari WhatsApp Channel/newsletter.

## Command

| Command | Fungsi |
| --- | --- |
| \`.plugin list\` / \`.plugins\` | Daftar plugin dan status aktifnya |
| \`.plugin info <nama>\` | Detail metadata dan alias plugin |
| \`.plugin enable <nama>\` | Mengaktifkan plugin |
| \`.plugin disable <nama>\` | Menonaktifkan plugin |
| \`.plugin reload all\` | Memuat ulang seluruh plugin secara staged |
| \`.plugin stats\` | Ringkasan plugin, command, dan kategori |

## Keamanan dan perilaku

- Semua command dilindungi permission owner dan diperiksa ulang pada handler.
- \`plugin-manager\` dilindungi agar tidak dapat menonaktifkan dirinya sendiri.
- Reload membangun registry kandidat terlebih dahulu. Jika ada file gagal di-import/divalidasi, registry aktif tidak diganti.
- Direktori kosong tidak boleh menghapus seluruh registry secara tidak sengaja.
- Status enable/disable disimpan di `data/database/plugins.json` dan dipulihkan saat startup. Jika penyimpanan gagal, perubahan runtime dibatalkan.
- Reload saat ini berlaku untuk seluruh plugin; reload satu plugin belum didukung agar konflik alias dan dependensi antar-plugin tetap tervalidasi secara global.
- Plugin adalah kode JavaScript lokal yang memiliki hak proses bot. Jangan menyalin plugin tidak tepercaya ke direktori plugin.

## Menu

\`.menu\` dan \`.help\` memakai renderer core yang sama. \`.catmenu <kategori>\` tetap mengambil kategori dari registry aktif. Plugin menu lama dihapus agar tidak ada dua implementasi dengan output berbeda.
