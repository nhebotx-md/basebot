'use strict';
const { igdl } = require('../../start/lib/function/igdl');
const { assertPublicHttpUrl } = require('../../src/core/security/safe-url');
module.exports = {
  name: 'igdl', commands: ['igdl'], category: 'downloader',
  description: 'Mengunduh media dari tautan Instagram publik.', usage: '.igdl <tautan Instagram>', permissions: {},
  async execute(ctx) {
    if (!ctx.text) return ctx.reply(`Contoh: ${ctx.prefix}igdl https://www.instagram.com/reel/...`);
    const data = await igdl(ctx.text);
    const items = Array.isArray(data?.data) ? [...new Map(data.data.filter(item => typeof item.url === 'string').map(item => [item.url, item.url])).values()] : [];
    if (!items.length) return ctx.reply('Media tidak ditemukan atau layanan downloader tidak tersedia.');
    for (const mediaUrl of items.slice(0, 8)) {
      await assertPublicHttpUrl(mediaUrl);
      const { buffer, contentType } = await ctx.services.media.downloadBuffer(mediaUrl, { maxBytes: 15 * 1024 * 1024, timeoutMs: 20000 });
      if (contentType.startsWith('image/')) await ctx.sendMessage(ctx.chat, { image: buffer, caption: 'Media Instagram.' }, { quoted: ctx.m.raw });
      else if (contentType.startsWith('video/')) await ctx.sendMessage(ctx.chat, { video: buffer, mimetype: contentType, caption: 'Media Instagram.' }, { quoted: ctx.m.raw });
      else throw new Error('Jenis media dari Instagram tidak didukung.');
    }
  }
};
