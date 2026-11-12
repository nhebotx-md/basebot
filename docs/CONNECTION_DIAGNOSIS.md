# Diagnosis koneksi dan observability BASEBOT

**Tanggal audit:** 12 November 2026
**Repository pembanding:** [`nhebotx-md/ShooNhee-md`](https://github.com/nhebotx-md/ShooNhee-md) pada commit `4547dea`
**Catatan:** tidak dilakukan pairing atau koneksi ke akun WhatsApp nyata selama audit.

## Kesimpulan dari log yang dilaporkan

Urutan `pairing code → connection close (515) → reconnect dijadwalkan → prompt shell kembali` memiliki dua kemungkinan penting yang harus dipisahkan:

1. **Kode 515 sendiri bukan bukti kegagalan.** Baileys mendokumentasikan `restartRequired` setelah pairing sebagai permintaan WhatsApp agar client membuat socket baru menggunakan kredensial yang baru. Pairing baru benar-benar terkonfirmasi jika pembaruan auth tersimpan dan koneksi berikutnya mencapai `open`. Log yang hanya menunjukkan kode dicetak dan status 515 belum membuktikan bahwa kode sudah diterima atau pairing berhasil.
2. **Penyebab paling kuat proses BASEBOT kembali ke shell sudah ditemukan di kode lama:** timer reconnect langsung dipanggil dengan `.unref()`. Setelah WebSocket ditutup, timer yang di-unref tidak menahan event loop Node. CLI dapat keluar sebelum callback reconnect membuat socket berikutnya. Ini sesuai dengan pola log yang diberikan.
3. **Log memperlihatkan `SHONNHEE`, yaitu kode kustom.** Kode lama meneruskan `PAIRING_CODE` sebagai argumen kedua ke Baileys. Di repository pembanding, argumen kustom itu sengaja tidak dipakai; library menghasilkan kode pairing sendiri. Isi `SHONNHEE` saja tidak cukup untuk membuktikan penyebab penolakan oleh WhatsApp, tetapi format generated-code adalah jalur yang didokumentasikan dan menghindari kompatibilitas kode kustom.
4. **Kredensial sebelumnya tidak memiliki flush barrier.** Listener `creds.update` memulai penyimpanan secara fire-and-forget. Socket baru atau shutdown dapat berjalan sebelum write yang sedang berlangsung selesai. Ini bukan penjelasan utama proses kembali ke shell, tetapi dapat menyebabkan sesi hasil pairing belum tersedia pada socket berikutnya.
5. **Satu plugin memang gagal dimuat.** Import `@ffmpeg-installer/ffmpeg` pada top-level `plugins/media/voicechanger.js` membuat seluruh modul plugin gagal di-load bila dependency/binari FFmpeg belum terpasang atau tidak tersedia. Loader lama hanya menyebut nama file dan tidak menampilkan stage, error code, message, atau stack; akibatnya hitungan turun menjadi 23 plugin/40 command tanpa diagnosis yang berguna.

## Apa yang dilakukan ShooNhee-md

Pada `src/connection.js`, ShooNhee-md menunggu sinyal `qr` sebelum meminta pairing code, menunggu lima detik, memeriksa WebSocket belum tertutup, lalu memanggil `requestPairingCode(normalizedPairingNumber)` **tanpa** kode kustom ([baris pairing](https://github.com/nhebotx-md/ShooNhee-md/blob/4547dea/src/connection.js#L422-L477)). Ia mendaftarkan `creds.update` untuk menyimpan auth, lalu menangani `connection.update`, memisahkan logout, status 405/440, dan reconnect umum ([listener dan reconnect](https://github.com/nhebotx-md/ShooNhee-md/blob/4547dea/src/connection.js#L532-L652)). Pada `open`, state dan watchdog diatur ulang ([open handler](https://github.com/nhebotx-md/ShooNhee-md/blob/4547dea/src/connection.js#L654-L705)).

**Versi transport berbeda.** ShooNhee-md menggunakan `ourin-baileys@9.0.21` dan mensyaratkan Node `>=22` ([package.json](https://github.com/nhebotx-md/ShooNhee-md/blob/4547dea/package.json#L22-L24), [dependency](https://github.com/nhebotx-md/ShooNhee-md/blob/4547dea/package.json#L68-L74)). BASEBOT tetap memakai `@itsliaaa/baileys@0.4.4` yang dipin. Karena itu saya mengambil pola alur pairing dan menghindari fixed code, bukan mengganti fork, socket config, atau API secara membabi buta.

Pola ShooNhee-md bukan seluruhnya disalin: source-nya memakai level Pino `silent`, mencetak nomor dan kode pairing ke terminal, memakai retry timer tanpa guard lifecycle yang setara, dan tidak menunjukkan penantian eksplisit atas write auth sebelum socket berikutnya. BASEBOT mempertahankan isolasi plugin serta redaksi rahasia, dan menerapkan penantian auth secara eksplisit.

## Perubahan yang diterapkan

- Timer reconnect sekarang tetap **referenced** agar proses CLI tetap hidup; reconnect pertama untuk 515 dijadwalkan segera setelah flush auth. Reconnect biasa memakai exponential backoff terbatas, dan repeated restart-required tetap dibatasi agar tidak menjadi loop cepat.
- Sebelum reconnect dan shutdown, BASEBOT menunggu antrean serial `creds.update` selesai. Error write dicatat dengan stack teredaksi dan reconnect memakai backoff, tidak melanjutkan jalur immediate restart.
- `PAIRING_CODE` lama masih dibaca agar `.env` lama tidak mematikan startup, tetapi diabaikan dengan warning. BASEBOT memanggil `requestPairingCode(phone)` tanpa fixed code. Kode pairing yang diperlukan untuk login hanya ditampilkan ke terminal dan tidak dimasukkan ke logger.
- Lifecycle logs BASEBOT mencakup timestamp, level, component, PID, status, alasan disconnect, kode status, status registered/new-login, reconnect attempt dan delay, tanpa mencetak QR, pairing code, nomor, atau isi chat. Pino Baileys default ke `warn`; field identitas account yang diketahui (`me`, JID, nomor, nama) disensor bahkan saat level `info`. Isi protokol dapat berubah antarversi, jadi simpan log privat dan jangan aktifkan debug protokol pada log publik.
- Plugin loader mencatat file, stage (import atau metadata-validation/registration), error dan stack. Startup melaporkan jumlah discovered/loaded/skipped serta jumlah plugin dan command.
- Import FFmpeg untuk voice changer dipindahkan ke saat command dijalankan. Plugin tidak lagi hilang dari registry hanya karena binari optional tidak tersedia; pengguna menerima instruksi `npm ci` yang spesifik.
- Handler event async sekarang memiliki error boundary sehingga rejection pada message/group handler tidak dibiarkan menjadi unhandled rejection.

## QA dan batas validasi

Unit test mencakup reconnect 515, socket kedua, timer yang tidak di-unref, penantian write auth sebelum reconnect/shutdown, penggunaan kode generated, redaksi structured logs/Pino info, penanganan rejection pairing, detail loader plugin, dan fallback FFmpeg. Tes tidak membuka socket WhatsApp dan tidak membuktikan pairing akun tertentu berhasil; operator tetap perlu menguji satu siklus nyata dengan kode yang dihasilkan BASEBOT dan memastikan log berakhir pada `connection: open`.

## Sumber

- [Baileys FAQ — reconnect setelah pairing dan restartRequired](https://baileys.wiki/faq)
- [Baileys troubleshooting — reconnect sendiri dan persistensi `creds.update`](https://baileys.wiki/advanced/troubleshooting)
- [Baileys pairing-code guide — cek registered dan minta kode setelah socket siap](https://baileys.wiki/authentication/pairing-code)
- [ShooNhee-md `src/connection.js` pada commit yang diaudit](https://github.com/nhebotx-md/ShooNhee-md/blob/4547dea/src/connection.js)
- [ShooNhee-md `package.json` pada commit yang diaudit](https://github.com/nhebotx-md/ShooNhee-md/blob/4547dea/package.json)
