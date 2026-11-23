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
| \`.addplugin <url>\` | Memasang plugin baru otomatis ke kategori metadata-nya |
| \`.addplugin custom <kategori> <url>\` | Memasang atau overwrite plugin pada kategori pilihan |
| \`.getplugin <nama\|command>\` | Menampilkan metadata dan source plugin terpasang |

## Keamanan dan perilaku

- Semua command dilindungi permission owner dan diperiksa ulang pada handler.
- \`plugin-manager\` dilindungi agar tidak dapat menonaktifkan dirinya sendiri.
- Reload membangun registry kandidat terlebih dahulu. Jika ada file gagal di-import/divalidasi, registry aktif tidak diganti.
- Direktori kosong tidak boleh menghapus seluruh registry secara tidak sengaja.
- Status enable/disable disimpan di `data/database/plugins.json` dan dipulihkan saat startup. Jika penyimpanan gagal, perubahan runtime dibatalkan.
- Reload saat ini berlaku untuk seluruh plugin; reload satu plugin belum didukung agar konflik alias dan dependensi antar-plugin tetap tervalidasi secara global.
- `.addplugin` menerima URL HTTPS publik dengan source maksimal 256 KB. Plugin wajib valid menurut Plugin API dan memiliki tepat satu command.
- `.addplugin custom <kategori> <url>` mengganti metadata kategori dengan kategori pilihan owner. Nama kategori hanya huruf kecil, angka, `-`, dan `_`.
- Jika nama plugin atau command sudah terdaftar, file plugin lama diganti secara atomik dan seluruh registry divalidasi ulang. Jika validasi gagal, file lama dipulihkan.
- File tujuan yang sudah ada tetapi tidak tercatat sebagai plugin tidak akan ditimpa. Path dibatasi ke direktori `plugins/`.
- `.getplugin` mencari berdasarkan nama plugin atau command dan mengirim metadata serta source dalam beberapa bagian jika diperlukan.
- Import source plugin menjalankan kode top-level dengan hak proses bot. Installer bukan sandbox; hanya pasang source yang benar-benar dipercaya.

## Menu

\`.menu\` dan \`.help\` memakai renderer core yang sama. \`.catmenu <kategori>\` tetap mengambil kategori dari registry aktif. Plugin menu lama dihapus agar tidak ada dua implementasi dengan output berbeda.
