'use strict';
const { assertPublicHttpUrl } = require('../../src/core/security/safe-url');
module.exports = {
  name: 'tiktok', commands: ['tiktok', 'tt'], category: 'downloader',
  description: 'Mengunduh video, slideshow foto, dan audio TikTok.', usage: '.tt <tautan TikTok>', permissions: {},
  async execute(ctx) {
    if (!ctx.text) return ctx.reply(`Contoh: ${ctx.prefix}tt https://vt.tiktok.com/...`);
    await ctx.progress.start('Memvalidasi tautan TikTok', { detail: 'Memeriksa alamat dan menyiapkan permintaan ke provider.' });
    const data = await ctx.services.downloaders.tiktok(ctx.text);
    const title = String(data.title || 'Konten TikTok').slice(0, 300);
    const total = Number(Boolean(data.videoUrl)) + Math.min(8, (data.images || []).length) + Number(Boolean(data.audioUrl));
    if (!total) {
      await ctx.progress.fail('Media tidak tersedia', { detail: 'Provider tidak mengembalikan video, foto, atau audio.' });
      return ctx.reply('Provider tidak mengembalikan media yang dapat dikirim.');
    }
    let completed = 0;
    if (data.videoUrl) {
      await ctx.progress.update('Mengunduh video TikTok', { detail: 'Memeriksa alamat file dan mengambil video.' });
      await assertPublicHttpUrl(data.videoUrl);
      const { buffer, contentType } = await ctx.services.media.downloadBuffer(data.videoUrl, { maxBytes: 20 * 1024 * 1024, timeoutMs: 25000 });
      if (!contentType.startsWith('video/')) throw new Error('File video TikTok tidak valid.');
      await ctx.progress.update('Mengirim video TikTok', { detail: 'Video siap dikirim ke WhatsApp.' });
      await ctx.sendMessage(ctx.chat, { video: buffer, mimetype: contentType, caption: `Video TikTok\n\n${title}` }, { quoted: ctx.m.raw });
      completed += 1;
    }
    for (const [index, imageUrl] of (data.images || []).slice(0, 8).entries()) {
      await ctx.progress.update('Mengunduh slideshow TikTok', { detail: 'Mengambil foto ' + (index + 1) + ' dari ' + Math.min(8, data.images.length) + '.' });
      await assertPublicHttpUrl(imageUrl);
      const { buffer, contentType } = await ctx.services.media.downloadBuffer(imageUrl, { maxBytes: 10 * 1024 * 1024, timeoutMs: 20000 });
      if (!contentType.startsWith('image/')) continue;
      await ctx.sendMessage(ctx.chat, { image: buffer, caption: `Slideshow TikTok ${index + 1}\n${title}` }, { quoted: ctx.m.raw });
      completed += 1;
    }
    if (data.audioUrl) {
      await ctx.progress.update('Mengunduh audio TikTok', { detail: 'Memeriksa dan mengambil file audio.' });
      await assertPublicHttpUrl(data.audioUrl);
      const { buffer, contentType } = await ctx.services.media.downloadBuffer(data.audioUrl, { maxBytes: 12 * 1024 * 1024, timeoutMs: 20000 });
      if (!contentType.startsWith('audio/')) throw new Error('Audio TikTok tidak valid.');
      await ctx.progress.update('Mengirim audio TikTok', { detail: 'Audio siap dikirim ke WhatsApp.' });
      await ctx.sendMessage(ctx.chat, { audio: buffer, mimetype: contentType, ptt: false }, { quoted: ctx.m.raw });
      completed += 1;
    }
    await ctx.progress.update('Pengiriman media selesai', { detail: completed + ' file berhasil dikirim.' });
  }
};