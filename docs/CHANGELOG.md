# Changelog

## 2.0.0 — Plugin architecture

- Mengganti switch command dan scan direktori per pesan dengan plugin loader, validator, registry, permission manager, context builder, dan dispatcher.
- Memigrasikan seluruh command legacy yang ditemukan ke `plugins/`, mempertahankan alias yang teridentifikasi, dan membuat menu otomatis.
- Memisahkan koneksi Baileys, pairing, reconnect, event handlers, services, dan konfigurasi.
- Mengunci fork Baileys npm pada `@itsliaaa/baileys@0.4.4` dan menghasilkan package lock.
- Memindahkan konfigurasi ke environment, melindungi session/temp/log/database, menghapus secret hardcoded dan akses `eval`/shell dari chat.
- Menambahkan unit test offline dan dokumentasi arsitektur/migrasi.
- Review independen memperketat SSRF dengan koneksi IP-pinned, mengunci permission auth/storage, meredaksi Authorization/Bearer/API key, menutup flood denial, membatasi event concurrency, dan memulihkan parity tagall/hidetag/welcome/status.

## 2.0.1 — Connection lifecycle dan diagnostics

- Memperbaiki exit event loop saat reconnect: timer tidak lagi di-unref dan restart-required 515 mendapat socket baru segera setelah auth flush.
- Menyerialkan penyimpanan `creds.update` dan menunggu persistence sebelum reconnect/shutdown; pairing memakai code generated Baileys, bukan nilai tetap `PAIRING_CODE`.
- Menambahkan log JSON bertimestamp, error stack teredaksi, ringkasan plugin discovery, serta klasifikasi lifecycle/reconnect.
- Memuat voicechanger tanpa import binari FFmpeg saat startup agar dependency media yang hilang tidak menghilangkan command; kegagalan memberikan instruksi install.
- Menambah regresi test offline untuk reconnect 515, process liveness, credential flush, logger, pairing dan voicechanger.
