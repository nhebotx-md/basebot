'use strict';
const { assertPublicHttpUrl } = require('../../src/core/security/safe-url');
module.exports = {
  name: 'ytmp3', commands: ['ytmp3', 'yta', 'ytmp3api'], category: 'downloader',
  description: 'Mengambil audio MP3 dari tautan YouTube yang boleh diunduh.', usage: '.ytmp3 <tautan YouTube>', permissions: {},
  async execute(ctx) {
    if (!ctx.text) return ctx.reply(`Contoh: ${ctx.prefix}ytmp3 https://youtu.be/VIDEO_ID`);
    const result = await ctx.services.downloaders.ytmp3(ctx.text);
    const media = result.buffer
      ? { buffer: result.buffer, contentType: result.contentType || 'audio/mpeg' }
      : (await (async () => {
          await assertPublicHttpUrl(result.urlmp3);
          return ctx.services.media.downloadBuffer(result.urlmp3, { maxBytes: 20 * 1024 * 1024, timeoutMs: 30000 });
        })());
    if (!media.contentType.startsWith('audio/')) throw new Error('Provider tidak mengembalikan file audio.');
    await ctx.sendMessage(ctx.chat, { audio: media.buffer, mimetype: media.contentType, ptt: false }, { quoted: ctx.m.raw });
  }
};
