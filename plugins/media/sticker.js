'use strict';
const fs = require('node:fs/promises');
module.exports = {
  name: 'sticker', commands: ['sticker', 's'], category: 'media',
  description: 'Membuat sticker dari gambar atau video yang dibalas.', usage: '.sticker (balas gambar/video)', permissions: {},
  async execute(ctx) {
    if (!ctx.quoted) return ctx.reply(`Balas gambar atau video dengan ${ctx.prefix}${ctx.command}.`);
    await ctx.progress.start('Mengunduh media sumber', { detail: 'Mengambil gambar atau video yang kamu balas.' });
    const media = await ctx.quoted.download();
    let output;
    if (ctx.mime.startsWith('image/')) {
      await ctx.progress.update('Mengonversi gambar menjadi sticker', { detail: 'Menerapkan metadata pack dan author.' });
      output = await ctx.client.sendImageAsSticker(ctx.chat, media, ctx.m.raw, { packname: ctx.config.sticker.packname, author: ctx.config.sticker.author });
    } else if (ctx.mime.startsWith('video/')) {
      if ((ctx.quoted.msg?.seconds || 0) > 10) { await ctx.progress.fail('Video terlalu panjang', { detail: 'Durasi maksimum sticker animasi adalah 10 detik.' }); return ctx.reply('Durasi video maksimal 10 detik.'); }
      await ctx.progress.update('Mengonversi video menjadi sticker animasi', { detail: 'Durasi maksimum 10 detik.' });
      output = await ctx.client.sendVideoAsSticker(ctx.chat, media, ctx.m.raw, { packname: ctx.config.sticker.packname, author: ctx.config.sticker.author });
    } else return ctx.reply(`Balas gambar atau video dengan ${ctx.prefix}${ctx.command}.`);
    if (typeof output === 'string') await fs.unlink(output).catch(() => {});
  }
};