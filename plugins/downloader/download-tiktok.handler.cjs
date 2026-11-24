'use strict';

const { getPluginProgress } = require('../../src/core/services/plugin-progress.service');
const { assertPublicHttpUrl } = require('../../src/core/security/safe-url');

const MODES = Object.freeze({
  video: 'video',
  vidio: 'video',
  audio: 'audio',
  mp3: 'audio',
  slide: 'slide',
  slides: 'slide',
  slideshow: 'slide',
  foto: 'slide'
});

function parseTikTokInput(input) {
  const parts = String(input || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { url: '', mode: '' };
  let mode = '';
  if (parts.length > 1) {
    const firstMode = MODES[parts[0].toLowerCase()];
    const lastMode = MODES[parts[parts.length - 1].toLowerCase()];
    if (firstMode) {
      mode = firstMode;
      parts.shift();
    } else if (lastMode) {
      mode = lastMode;
      parts.pop();
    }
  }
  return { url: parts.join(' '), mode };
}

async function sendSlideAlbum(ctx, images, title, progress) {
  const albumItems = [];
  let totalBytes = 0;
  for (const [index, imageUrl] of images.entries()) {
    await progress.update('Mengunduh slideshow TikTok', {
      detail: 'Mengambil foto ' + (index + 1) + ' dari ' + images.length + '.'
    });
    await assertPublicHttpUrl(imageUrl);
    const { buffer, contentType } = await ctx.services.media.downloadBuffer(imageUrl, {
      maxBytes: 10 * 1024 * 1024, timeoutMs: 20000
    });
    if (!contentType.startsWith('image/')) continue;
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error('Foto slideshow TikTok kosong atau tidak valid.');
    totalBytes += buffer.length;
    if (totalBytes > 40 * 1024 * 1024) throw new Error('Total slideshow TikTok melebihi batas 40 MB.');
    albumItems.push({ image: buffer, caption: 'Slideshow TikTok ' + (index + 1) + '/' + images.length + '\n' + title });
  }
  if (!albumItems.length) throw new Error('Postingan ini tidak menyediakan foto slideshow yang dapat diunduh.');
  await progress.update('Mengirim slideshow TikTok', {
    detail: albumItems.length + ' foto siap dikirim sebagai album.'
  });
  for (let index = 0; index < albumItems.length; index += 10) {
    const batch = albumItems.slice(index, index + 10);
    if (typeof ctx.client?.albumMessage === 'function' && batch.length > 1) {
      await ctx.client.albumMessage(ctx.chat, batch, ctx.m.raw);
    } else {
      for (const item of batch) await ctx.sendMessage(ctx.chat, item, { quoted: ctx.m.raw });
    }
  }
  return albumItems.length;
}

module.exports = {
  name: 'tiktok',
  commands: ['tiktok', 'tt'],
  category: 'downloader',
  description: 'Mengunduh video, audio MP3, atau seluruh foto slideshow TikTok sesuai pilihan.',
  usage: '.tt <tautan TikTok> <video|audio|slide>',
  permissions: {},
  async execute(ctx) {
    const progress = getPluginProgress(ctx);
    const { url, mode } = parseTikTokInput(ctx.text);
    if (!url) return ctx.reply(
      'Cara menggunakan downloader TikTok:\n' +
      ctx.prefix + 'tt <tautan> video\n' +
      ctx.prefix + 'tt <tautan> audio\n' +
      ctx.prefix + 'tt <tautan> slide\n\n' +
      'Pilihan: video (MP4), audio (MP3), atau slide (album foto).'
    );
    if (!mode) return ctx.reply(
      'Pilih jenis media yang ingin diunduh:\n\n' +
      '1. Video MP4\n' + ctx.prefix + 'tt ' + url + ' video\n\n' +
      '2. Audio MP3\n' + ctx.prefix + 'tt ' + url + ' audio\n\n' +
      '3. Slideshow foto\n' + ctx.prefix + 'tt ' + url + ' slide'
    );

    await progress.start('Memvalidasi tautan TikTok', {
      detail: 'Memeriksa alamat dan menyiapkan provider media.'
    });
    const data = await ctx.services.downloaders.tiktok(url, { mode });
    const title = String(data.title || 'Konten TikTok').slice(0, 300);

    if (mode === 'video') {
      if (!data.videoUrl) throw new Error('Postingan ini tidak menyediakan video. Coba pilihan slide jika kontennya berupa foto.');
      await progress.update('Mengunduh video TikTok', { detail: 'Mengambil kualitas video terbaik yang tersedia.' });
      await assertPublicHttpUrl(data.videoUrl);
      const { buffer, contentType } = await ctx.services.media.downloadBuffer(data.videoUrl, {
        maxBytes: 20 * 1024 * 1024, timeoutMs: 30000
      });
      if (!contentType.startsWith('video/')) throw new Error('File video TikTok tidak valid.');
      await progress.update('Mengirim video TikTok', { detail: 'Video siap dikirim ke WhatsApp.' });
      await ctx.sendMessage(ctx.chat, {
        video: buffer, mimetype: contentType, caption: 'TikTok Video\n\n' + title
      }, { quoted: ctx.m.raw });
      return progress.update('Video TikTok selesai', { detail: 'Video berhasil dikirim.' });
    }

    if (mode === 'audio') {
      if (!data.audioUrl) throw new Error('Postingan ini tidak menyediakan soundtrack yang dapat diunduh.');
      await progress.update('Mengunduh audio TikTok', { detail: 'Mengambil soundtrack asli postingan.' });
      await assertPublicHttpUrl(data.audioUrl);
      const { buffer, contentType } = await ctx.services.media.downloadBuffer(data.audioUrl, {
        maxBytes: 20 * 1024 * 1024, timeoutMs: 30000
      });
      if (!contentType.startsWith('audio/')) throw new Error('File audio TikTok tidak valid.');
      await progress.update('Mengirim audio TikTok', { detail: 'Audio siap dikirim ke WhatsApp.' });
      await ctx.sendMessage(ctx.chat, { audio: buffer, mimetype: contentType, ptt: false }, { quoted: ctx.m.raw });
      return progress.update('Audio TikTok selesai', { detail: 'Audio berhasil dikirim.' });
    }

    const images = Array.isArray(data.images) ? data.images.filter(value => typeof value === 'string').slice(0, 30) : [];
    const sent = await sendSlideAlbum(ctx, images, title, progress);
    return progress.update('Slideshow TikTok selesai', { detail: sent + ' foto berhasil dikirim.' });
  }
};

module.exports.parseTikTokInput = parseTikTokInput;
module.exports.sendSlideAlbum = sendSlideAlbum;
