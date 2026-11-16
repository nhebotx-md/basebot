'use strict';
const { assertPublicHttpUrl } = require('../../src/core/security/safe-url');
module.exports = {
  name: 'tiktok', commands: ['tiktok', 'tt'], category: 'downloader',
  description: 'Mengunduh video, slideshow foto, dan audio TikTok.', usage: '.tt <tautan TikTok>', permissions: {},
  async execute(ctx) {
    if (!ctx.text) return ctx.reply(`Contoh: ${ctx.prefix}tt https://vt.tiktok.com/...`);
    const data = await ctx.services.downloaders.tiktok(ctx.text);
    const title = String(data.title || 'Konten TikTok').slice(0, 300);
    if (data.videoUrl) {
      await assertPublicHttpUrl(data.videoUrl);
      const { buffer, contentType } = await ctx.services.media.downloadBuffer(data.videoUrl, { maxBytes: 20 * 1024 * 1024, timeoutMs: 25000 });
      if (!contentType.startsWith('video/')) throw new Error('File video TikTok tidak valid.');
      await ctx.sendMessage(ctx.chat, { video: buffer, mimetype: contentType, caption: `Video TikTok\n\n${title}` }, { quoted: ctx.m.raw });
    }
    for (const [index, imageUrl] of (data.images || []).slice(0, 8).entries()) {
      await assertPublicHttpUrl(imageUrl);
      const { buffer, contentType } = await ctx.services.media.downloadBuffer(imageUrl, { maxBytes: 10 * 1024 * 1024, timeoutMs: 20000 });
      if (!contentType.startsWith('image/')) continue;
      await ctx.sendMessage(ctx.chat, { image: buffer, caption: `Slideshow TikTok ${index + 1}\n${title}` }, { quoted: ctx.m.raw });
    }
    if (data.audioUrl) {
      await assertPublicHttpUrl(data.audioUrl);
      const { buffer, contentType } = await ctx.services.media.downloadBuffer(data.audioUrl, { maxBytes: 12 * 1024 * 1024, timeoutMs: 20000 });
      if (!contentType.startsWith('audio/')) throw new Error('Audio TikTok tidak valid.');
      await ctx.sendMessage(ctx.chat, { audio: buffer, mimetype: contentType, ptt: false }, { quoted: ctx.m.raw });
    }
    if (!data.videoUrl && !(data.images || []).length && !data.audioUrl) return ctx.reply('Provider tidak mengembalikan media yang dapat dikirim.');
  }
};
