# Changelog

## 2.0.0 — Plugin architecture

- Mengganti switch command dan scan direktori per pesan dengan plugin loader, validator, registry, permission manager, context builder, dan dispatcher.
- Memigrasikan seluruh command legacy yang ditemukan ke `plugins/`, mempertahankan alias yang teridentifikasi, dan membuat menu otomatis.
- Memisahkan koneksi Baileys, pairing, reconnect, event handlers, services, dan konfigurasi.
- Mengunci fork Baileys npm pada `@itsliaaa/baileys@0.4.4` dan menghasilkan package lock.
- Memindahkan konfigurasi ke environment, melindungi session/temp/log/database, menghapus secret hardcoded dan akses `eval`/shell dari chat.
- Menambahkan unit test offline dan dokumentasi arsitektur/migrasi.

- Review independen memperketat SSRF dengan koneksi IP-pinned, mengunci permission auth/storage, meredaksi Authorization/Bearer/API key, menutup flood denial, membatasi event concurrency, dan memulihkan parity tagall/hidetag/welcome/status.
