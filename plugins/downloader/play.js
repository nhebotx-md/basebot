'use strict';
const yts = require('yt-search');
module.exports = {
  name: 'play', commands: ['play'], category: 'downloader',
  description: 'Mencari judul lagu dan mengirim audio.', usage: '.play <judul lagu>', permissions: {},
  async execute(ctx) {
    if (!ctx.text) return ctx.reply(`Contoh: ${ctx.prefix}play nama lagu`);
    const search = await yts(ctx.text);
    const video = search.videos?.find(item => item.url) || search.all?.find(item => item.url);
    if (!video?.url) return ctx.reply('Video tidak ditemukan.');
    const converted = await ctx.services.downloaders.ytmp3(video.url);
    const media = converted.buffer
      ? { buffer: converted.buffer, contentType: converted.contentType || 'audio/mpeg' }
      : await ctx.services.media.downloadBuffer(converted.urlmp3, { maxBytes: 20 * 1024 * 1024, timeoutMs: 30000 });
    if (!media.contentType.startsWith('audio/')) throw new Error('Respons konversi bukan audio.');
    await ctx.sendMessage(ctx.chat, { audio: media.buffer, mimetype: media.contentType, ptt: false }, { quoted: ctx.m.raw });
  }
};
