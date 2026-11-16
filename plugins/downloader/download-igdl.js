'use strict';
const { assertPublicHttpUrl } = require('../../src/core/security/safe-url');
module.exports = {
  name: 'igdl', commands: ['igdl'], category: 'downloader',
  description: 'Mengunduh Reels, video, foto, dan carousel Instagram publik.', usage: '.igdl <tautan Instagram>', permissions: {},
  async execute(ctx) {
    if (!ctx.text) return ctx.reply(`Contoh: ${ctx.prefix}igdl https://www.instagram.com/reel/...`);
    const data = await ctx.services.downloaders.igdl(ctx.text);
    const raw = Array.isArray(data?.data) ? data.data : [];
    const items = [...new Map(raw.filter(item => typeof item.url === 'string').map(item => [item.url, item])).values()].slice(0, 8);
    if (!items.length) return ctx.reply('Media tidak ditemukan atau layanan downloader tidak tersedia.');
    for (const item of items) {
      await assertPublicHttpUrl(item.url);
      const { buffer, contentType } = await ctx.services.media.downloadBuffer(item.url, { maxBytes: 15 * 1024 * 1024, timeoutMs: 20000 });
      if (contentType.startsWith('image/')) await ctx.sendMessage(ctx.chat, { image: buffer, caption: 'Media Instagram.' }, { quoted: ctx.m.raw });
      else if (contentType.startsWith('video/')) await ctx.sendMessage(ctx.chat, { video: buffer, mimetype: contentType, caption: 'Media Instagram.' }, { quoted: ctx.m.raw });
      else throw new Error('Jenis media dari Instagram tidak didukung.');
    }
  }
};
