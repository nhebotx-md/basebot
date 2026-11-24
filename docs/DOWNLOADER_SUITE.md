# Downloader Suite

MUSE-MD menyediakan empat command:

- `.play <judul lagu>`: mencari judul melalui YouTube Search lalu mengirim audio biasa.
- `.igdl <tautan Instagram>`: Reels, video, foto, dan carousel publik (maksimal 8 media).
- `.tt <tautan TikTok>`: video, slideshow hingga 8 foto, dan audio; alias `.tiktok` tetap tersedia.
- `.ytmp3 <tautan YouTube>`: mengirim audio dari URL YouTube yang valid.

## Provider dan fallback tanpa Cobalt

Soclip menjadi provider pertama untuk Instagram, TikTok, dan YouTube. Soclip mengembalikan metadata serta URL media langsung melalui `POST https://api.soclip.dev/v1/media`. MUSE-MD memakai API key Bearer dari environment. Setiap ekstraksi sukses menggunakan kredit provider; periksa dashboard Soclip untuk saldo dan penggunaan.

Jika Soclip gagal:
- Instagram mencoba adapter Instagram lama.
- TikTok mencoba adapter TikTok lama.
- YouTube mencoba converter lama, lalu yt-dlp lokal bila diaktifkan.

Cobalt sudah dihapus dari implementasi dan konfigurasi. Tidak ada URL Cobalt yang diperlukan.

## Konfigurasi

Daftarkan API key di dashboard Soclip, lalu isi file `.env` pada mesin bot:

```dotenv
SOCLIP_API_KEY=sc_live_your_key_here
DOWNLOADER_FALLBACK=true
YTDLP_ENABLED=true
YTDLP_PATH=yt-dlp
```

Jangan commit API key ke GitHub atau mengirimkannya ke chat. Jika `SOCLIP_API_KEY` kosong, MUSE-MD melewati Soclip dan langsung mencoba provider cadangan. Untuk fallback audio YouTube lokal, pasang `yt-dlp` dan FFmpeg pada server; `YTDLP_PATH` dapat berisi path absolut.

## Diagnostik

Jika semua provider gagal, error menyebutkan nama provider dan ringkasan penyebab tiap percobaan (misalnya key invalid, rate limit, timeout, atau provider tidak mengembalikan tipe media yang diperlukan). Ini menggantikan pesan generik yang sebelumnya menyembunyikan akar masalah.

## Batas keamanan dan operasional

- URL input dibatasi ke domain HTTPS Instagram, TikTok, dan YouTube.
- URL media yang dikembalikan provider diperiksa sebagai URL publik sebelum diunduh.
- Batas carousel/slideshow 8 media; batas ukuran unduhan ditetapkan pada plugin.
- Request provider memiliki timeout dan batas ukuran JSON; tidak mengikuti redirect API.
- Provider pihak ketiga dapat berubah, membatasi request, atau mengalami gangguan. Unit test memakai mock dan tidak membuktikan ketersediaan API live.
- Gunakan hanya konten yang Anda miliki, berlisensi, atau memiliki izin untuk diunduh. Patuhi ketentuan platform dan hak cipta.

## Uji manual

1. Isi `SOCLIP_API_KEY` pada `.env` dan restart bot.
2. Jalankan `npm ci`, `npm test`, dan `npm run check`.
3. Uji `.play` dengan judul audio yang boleh digunakan.
4. Uji `.igdl` pada satu Reel dan satu carousel publik.
5. Uji `.tt` pada video, slideshow, dan audio TikTok publik.
6. Uji `.ytmp3` pada konten YouTube yang Anda miliki atau diizinkan untuk diunduh.
7. Uji fallback dengan API key salah pada lingkungan uji; periksa bahwa provider cadangan dijalankan dan diagnostik menyebutkan kegagalan Soclip.
