'use strict';
const yts = require('yt-search');
module.exports = {
  name: 'play', commands: ['play'], category: 'downloader',
  description: 'Mencari dan mengirim audio YouTube.', usage: '.play <judul lagu>', permissions: {},
  async execute(ctx) {
    if (!ctx.text) return ctx.reply(`Contoh: ${ctx.prefix}play nama lagu`);
    const search = await yts(ctx.text);
    const video = search.videos?.[0] || search.all?.[0];
    if (!video?.url) return ctx.reply('Video tidak ditemukan.');
    const converted = await ctx.services.downloaders.ytmp3(video.url);
    const { buffer, contentType } = await ctx.services.media.downloadBuffer(converted.urlmp3, { maxBytes: 20 * 1024 * 1024, timeoutMs: 30000 });
    if (!contentType.startsWith('audio/')) throw new Error('Respons konversi bukan audio.');
    await ctx.sendMessage(ctx.chat, { audio: buffer, mimetype: contentType || 'audio/mpeg', ptt: true }, { quoted: ctx.m.raw });
  }
};
