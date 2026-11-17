'use strict';

const { getPluginProgress } = require('../../src/core/services/plugin-progress.service');
const { assertPublicHttpUrl } = require('../../src/core/security/safe-url');
module.exports = {
  name: 'tiktok', commands: ['tiktok', 'tt'], category: 'downloader',
  description: 'Mengunduh video, slideshow foto, dan audio TikTok.', usage: '.tt <tautan TikTok>', permissions: {},
  async execute(ctx) {
    const progress = getPluginProgress(ctx);
    if (!ctx.text) return ctx.reply(`Contoh: ${ctx.prefix}tt https://vt.tiktok.com/...`);
    await progress.start('Memvalidasi tautan TikTok', { detail: 'Memeriksa alamat dan menyiapkan permintaan ke provider.' });
    const data = await ctx.services.downloaders.tiktok(ctx.text);
    const title = String(data.title || 'Konten TikTok').slice(0, 300);
    const images = Array.isArray(data.images) ? data.images.slice(0, 8) : [];
    const total = Number(Boolean(data.videoUrl)) + images.length + Number(Boolean(data.audioUrl));
    if (!total) {
      await progress.fail('Media tidak tersedia', { detail: 'Provider tidak mengembalikan video, foto, atau audio.' });
      return ctx.reply('Provider tidak mengembalikan media yang dapat dikirim.');
    }
    let completed = 0;
    if (data.videoUrl) {
      await progress.update('Mengunduh video TikTok', { detail: 'Memeriksa alamat file dan mengambil video.' });
      await assertPublicHttpUrl(data.videoUrl);
      const { buffer, contentType } = await ctx.services.media.downloadBuffer(data.videoUrl, { maxBytes: 20 * 1024 * 1024, timeoutMs: 25000 });
      if (!contentType.startsWith('video/')) throw new Error('File video TikTok tidak valid.');
      await progress.update('Mengirim video TikTok', { detail: 'Video siap dikirim ke WhatsApp.' });
      await ctx.sendMessage(ctx.chat, { video: buffer, mimetype: contentType, caption: `Video TikTok\n\n${title}` }, { quoted: ctx.m.raw });
      completed += 1;
    }
    const albumItems = [];
    let albumBytes = 0;
    for (const [index, imageUrl] of images.entries()) {
      await progress.update('Mengunduh slideshow TikTok', { detail: 'Mengambil foto ' + (index + 1) + ' dari ' + images.length + '.' });
      await assertPublicHttpUrl(imageUrl);
      const { buffer, contentType } = await ctx.services.media.downloadBuffer(imageUrl, { maxBytes: 10 * 1024 * 1024, timeoutMs: 20000 });
      if (!contentType.startsWith('image/')) continue;
      if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error('Foto slideshow TikTok kosong atau tidak valid.');
      albumBytes += buffer.length;
      if (albumBytes > 40 * 1024 * 1024) throw new Error('Total slideshow TikTok melebihi batas 40 MB.');
      albumItems.push({ image: buffer, caption: 'Slideshow TikTok ' + (index + 1) + '\n' + title });
    }
    if (albumItems.length) {
      await progress.update('Mengirim album slideshow TikTok', { detail: albumItems.length + ' foto akan dikirim dalam satu album WhatsApp.' });
      if (typeof ctx.client?.albumMessage === 'function') {
        await ctx.client.albumMessage(ctx.chat, albumItems, ctx.m.raw);
      } else {
        for (const item of albumItems) await ctx.sendMessage(ctx.chat, item, { quoted: ctx.m.raw });
      }
      completed += albumItems.length;
    }
    if (data.audioUrl) {
      await progress.update('Mengunduh audio TikTok', { detail: 'Memeriksa dan mengambil file audio.' });
      await assertPublicHttpUrl(data.audioUrl);
      const { buffer, contentType } = await ctx.services.media.downloadBuffer(data.audioUrl, { maxBytes: 12 * 1024 * 1024, timeoutMs: 20000 });
      if (!contentType.startsWith('audio/')) throw new Error('Audio TikTok tidak valid.');
      await progress.update('Mengirim audio TikTok', { detail: 'Audio siap dikirim ke WhatsApp.' });
      await ctx.sendMessage(ctx.chat, { audio: buffer, mimetype: contentType, ptt: false }, { quoted: ctx.m.raw });
      completed += 1;
    }
    await progress.update('Pengiriman media selesai', { detail: completed + ' file berhasil dikirim.' });
  }
};