'use strict';

const { getPluginProgress } = require('../../src/core/services/plugin-progress.service');
const { assertPublicHttpUrl } = require('../../src/core/security/safe-url');
module.exports = {
  name: 'igdl', commands: ['igdl'], category: 'downloader',
  description: 'Mengunduh Reels, video, foto, dan carousel Instagram publik.', usage: '.igdl <tautan Instagram>', permissions: {},
  async execute(ctx) {
    const progress = getPluginProgress(ctx);
    if (!ctx.text) return ctx.reply(`Contoh: ${ctx.prefix}igdl https://www.instagram.com/reel/...`);
    await progress.start('Memvalidasi tautan Instagram', { detail: 'Memastikan alamat tujuan aman sebelum meminta media.' });
    const data = await ctx.services.downloaders.igdl(ctx.text);
    // Fallback yt-dlp mengembalikan buffer langsung (bukan daftar URL).
    if (data.buffer) {
      const contentType = String(data.contentType || '');
      if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
        throw new Error('Jenis media dari Instagram tidak didukung.');
      }
      await progress.update('Mengirim media Instagram', { detail: 'Media hasil fallback siap dikirim.' });
      const message = contentType.startsWith('image/')
        ? { image: data.buffer, caption: 'Media Instagram.' }
        : { video: data.buffer, mimetype: contentType, caption: 'Media Instagram.' };
      await ctx.sendMessage(ctx.chat, message, { quoted: ctx.m.raw });
      return progress.update('Media Instagram berhasil dikirim', { detail: '1 media terkirim.' });
    }
    const raw = Array.isArray(data?.data) ? data.data : [];
    const items = [...new Map(raw.filter(item => typeof item.url === 'string').map(item => [item.url, item])).values()].slice(0, 8);
    if (!items.length) {
      await progress.fail('Media tidak ditemukan', { detail: 'Provider tidak mengembalikan media yang dapat diunduh.' });
      return ctx.reply('Media tidak ditemukan atau layanan downloader tidak tersedia.');
    }
    await progress.update('Mengunduh media Instagram', { detail: items.length + ' item ditemukan. Memeriksa dan mengunduh setiap file.' });
    const albumItems = [];
    let totalBytes = 0;
    for (const [index, item] of items.entries()) {
      await assertPublicHttpUrl(item.url);
      const { buffer, contentType } = await ctx.services.media.downloadBuffer(item.url, { maxBytes: 15 * 1024 * 1024, timeoutMs: 20000 });
      if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error('Media Instagram kosong atau tidak valid.');
      totalBytes += buffer.length;
      if (totalBytes > 40 * 1024 * 1024) throw new Error('Total media carousel Instagram melebihi batas 40 MB.');
      const caption = 'Media Instagram ' + (index + 1) + '/' + items.length + '.';
      if (contentType.startsWith('image/')) albumItems.push({ image: buffer, caption });
      else if (contentType.startsWith('video/')) albumItems.push({ video: buffer, mimetype: contentType, caption });
      else throw new Error('Jenis media dari Instagram tidak didukung.');
      await progress.update('Menyiapkan album Instagram', { detail: 'Item ' + (index + 1) + ' dari ' + items.length + ' berhasil diunduh dan divalidasi.' });
    }
    await progress.update('Mengirim album Instagram', { detail: albumItems.length + ' media akan dikirim dalam satu album WhatsApp.' });
    if (typeof ctx.client?.albumMessage === 'function') {
      await ctx.client.albumMessage(ctx.chat, albumItems, ctx.m.raw);
    } else {
      for (const item of albumItems) await ctx.sendMessage(ctx.chat, item, { quoted: ctx.m.raw });
    }
    await progress.update('Album Instagram berhasil dikirim', { detail: albumItems.length + ' media terkirim.' });
  }
};