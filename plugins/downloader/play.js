'use strict';
const yts = require('yt-search');
module.exports = {
  name: 'play', commands: ['play'], category: 'downloader',
  description: 'Mencari judul lagu dan mengirim audio.', usage: '.play <judul lagu>', permissions: {},
  async execute(ctx) {
    if (!ctx.text) return ctx.reply(`Contoh: ${ctx.prefix}play nama lagu`);
    await ctx.progress.start('Mencari lagu', { detail: 'Mencari judul yang paling relevan di katalog video.' });
    const search = await yts(ctx.text);
    const video = search.videos?.find(item => item.url) || search.all?.find(item => item.url);
    if (!video?.url) {
      await ctx.progress.fail('Lagu tidak ditemukan', { detail: 'Tidak ada hasil pencarian yang memiliki tautan video.' });
      return ctx.reply('Video tidak ditemukan.');
    }
    await ctx.progress.update('Menghubungi layanan konversi', { detail: 'Menyiapkan audio dari hasil pencarian.' });
    const converted = await ctx.services.downloaders.ytmp3(video.url);
    let media;
    if (converted.buffer) media = { buffer: converted.buffer, contentType: converted.contentType || 'audio/mpeg' };
    else {
      await ctx.progress.update('Mengunduh file audio', { detail: 'Mengambil hasil konversi dan memeriksa format audio.' });
      media = await ctx.services.media.downloadBuffer(converted.urlmp3, { maxBytes: 20 * 1024 * 1024, timeoutMs: 30000 });
    }
    if (!media.contentType.startsWith('audio/')) throw new Error('Respons konversi bukan audio.');
    await ctx.progress.update('Mengirim audio', { detail: 'Audio siap dan sedang dikirim ke percakapan.' });
    await ctx.sendMessage(ctx.chat, { audio: media.buffer, mimetype: media.contentType, ptt: false }, { quoted: ctx.m.raw });
  }
};