# Rencana dan Status Refactoring

## Audit baseline

Repository awal berisi 34 file terlacak dan sekitar 2.7k baris JavaScript, tanpa `package-lock.json`. `index.js` menggabungkan socket, pairing, listener, helper media, welcome, dan auto-reload; `message.js` menampung parsing, scan plugin setiap pesan, dan switch command. Plugin lama berbentuk function metadata terpisah. Baileys ditarik dari branch GitHub tanpa pin dan protokolnya diunduh dinamis dari `master`.

Risiko baseline: file helper memiliki kredensial email hardcoded; config global berisi nomor owner dan pairing code; switch menyediakan `eval`/`exec` melalui chat; URL/media request tidak dibatasi ukuran/timeout secara konsisten; listener memakai auto-watch berulang; temp cleanup memakai folder yang juga berisi aset repository.

## Tahap migrasi

1. Audit selesai untuk seluruh file tracked yang tersedia pada shallow clone. Lampiran instruksi pengguna terpotong di awal kalimat bagian 14; bagian yang hilang tidak dapat diaudit.
2. Fondasi dibuat: konfigurasi, validasi, logger redacted, client, connection/pairing, event handler terpisah, media/message/storage services, security, dan shutdown.
3. Plugin engine selesai untuk kontrak, recursive loader deterministik, validator, registry Map, alias/collision, enable/disable, parser, dispatcher, dedupe, permission, dan error boundary.
4. Command lama yang ditemukan dipindah ke plugin: `bocchi/bocci`, `brat/sbrat`, `bratvid/bratvideo`, `csesi/clearsesi`, `delsampah/dsampah`, `igdl`, `tiktok`, `play`, `qc`, `listsampah/sampah`, `sticker/s`, `upsw`, serta seluruh alias voice changer. Switch lama juga dimigrasikan: `menu/help`, `get`, `public`, `self`, `tagall`, `hidetag/h`, `jeslyn`, enam alias enhancer, empat alias sticker watermark, `reactch`, dan event welcome. `eval`/shell exec dihapus.
5. Core root disederhanakan menjadi entrypoint; loader switch lama dan config global dihapus.
6. Hardening akhir menambah transport SSRF DNS-pinned tanpa redirect, izin auth/storage 0700/0600 dan penolakan symlink, logger Authorization/Bearer/Cookie, rate-limit denial, semaphore command/event, single-flight socket, FFmpeg executable terpin, serta parity owner-admin, quoted hidetag, welcome promote/demote, dan delete status mention.
7. 31 tes offline meliputi parser/normalisasi, registry/loader, permission, burst/concurrency, session/storage, pairing, event plugin, logger redaction, config, safe URL, serta Baileys export.
8. Quality gate terakhir: `npm ci`, 31 unit test lulus, `npm run check`, smoke load 24 plugin/52 command tanpa error, `git diff --check`, serta `npm audit --omit=dev` dengan 0 kerentanan. Sebelum rilis, tetap lakukan smoke test koneksi dengan akun uji. Pairing tidak dicoba dari sandbox karena memerlukan akun WhatsApp operator.

## Risiko/pekerjaan lanjutan

Credential SMTP yang tertanam di helper lama sudah dihapus dari working tree. Karena clone awal shallow dan file tersebut pernah terlacak, riwayat remote penuh tidak dapat dipastikan dari clone ini; rotasi credential tetap wajib dan repository history harus dipindai pada clone penuh. Tidak ada credential yang dicantumkan di laporan. Unit test offline tidak membuktikan seluruh fork Baileys/media API berjalan di akun nyata. Domain API downloader/AI merupakan layanan pihak ketiga dan dapat berubah; pantau timeout/error dan kebijakan layanan.
