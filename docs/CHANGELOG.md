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

## Logger visual — Terminal observability

- Menambahkan tema terminal berwarna dengan banner startup, ringkasan plugin, panel koneksi, level berikon, dan kartu command berhasil.
- Menjaga mode JSON terstruktur untuk integrasi log; warna terminal otomatis nonaktif pada output non-TTY/`NO_COLOR` dan bisa dikontrol melalui `LOG_COLOR`.
- Kartu aktivitas tidak menampilkan identitas pengirim atau isi chat; redaksi logger juga mencakup field identitas umum.

## Sticker REST API — Generator Brat

- Menambahkan plugin `.stickerapi brat|animated <teks>` dengan provider Siputzx, signature-check PNG/GIF, timeout 15 detik, batas unduhan 8 MiB, fallback opsional dan konversi WebP/EXIF oleh BASEBOT.
- Provider Asepharyana pada host alternate hanya tersedia setelah `STICKER_API_ASEPHARYANA_ENABLED=true`; default nonaktif karena host berbeda dari domain dokumentasi awal.
- Mengisolasi temporary input/output FFmpeg di direktori privat, membersihkannya pada sukses/gagal, memberi timeout proses 45 detik, dan menambah regression test converter.
- Dokumentasi audit API mencatat kandidat yang tidak dipilih, sumber verifikasi, serta batas bahwa tidak ada API yang menghasilkan WhatsApp sticker siap kirim secara langsung.

## Quote Sticker `.qc` — Warna custom

- Mengganti generator quote lama dengan `.qc <warna|#RRGGBB> <teks>` dan mode balas pesan, serta menambahkan alias `qcstc`, `stcqc`, `qcstic`, `qcstick`, dan `quotesticker`.
- Menambahkan layanan POST JSON HTTPS dengan DNS pinning, batas ukuran body/response, timeout, dan tanpa redirect; respons PNG diverifikasi sebelum dikonversi menjadi sticker.
- Avatar profil diambil melalui downloader DNS-pinned dengan signature-check dan batas 1 MiB, lalu disisipkan sebagai data URL agar API tidak mengambil URL avatar pengguna secara langsung.
