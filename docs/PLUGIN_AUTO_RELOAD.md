# Plugin Auto Reload

Dengan `PLUGIN_AUTO_RELOAD=true` (default), BASEBOT memantau direktori plugin dan subdirektorinya. Perubahan file JavaScript digabung dengan debounce 700 ms, lalu plugin dimuat ke registry kandidat dan divalidasi.

Registry aktif hanya diganti jika seluruh file lolos validasi. Jika ada file rusak, command duplikat, metadata tidak valid, atau direktori kosong, reload dibatalkan dan registry lama tetap dipakai. Status plugin nonaktif dipertahankan.

## Command
- `.plugin watch`: status watcher dan jumlah reload berhasil/gagal.
- `.plugin reload all`: reload manual tanpa restart.
- `.plugin stats`: statistik registry.

## Konfigurasi
- `PLUGIN_AUTO_RELOAD=true|false`.
- `PLUGIN_WATCH_DEBOUNCE_MS=700` (150-5000 ms).

Auto reload hanya memuat ulang modul di direktori plugin. Perubahan core, dependency, konfigurasi proses, atau package lock tetap memerlukan restart terencana. Gunakan penyimpanan file atomik untuk menghindari pembacaan file setengah jadi.
