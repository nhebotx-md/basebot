'use strict';
const fs = require('node:fs/promises');
module.exports = {
  name: 'sticker', commands: ['sticker', 's'], category: 'media',
  description: 'Membuat sticker dari gambar atau video yang dibalas.', usage: '.sticker (balas gambar/video)', permissions: {},
  async execute(ctx) {
    if (!ctx.quoted) return ctx.reply(`Balas gambar atau video dengan ${ctx.prefix}${ctx.command}.`);
    const media = await ctx.quoted.download();
    let output;
    if (ctx.mime.startsWith('image/')) output = await ctx.client.sendImageAsSticker(ctx.chat, media, ctx.m.raw, { packname: ctx.config.sticker.packname, author: ctx.config.sticker.author });
    else if (ctx.mime.startsWith('video/')) {
      if ((ctx.quoted.msg?.seconds || 0) > 10) return ctx.reply('Durasi video maksimal 10 detik.');
      output = await ctx.client.sendVideoAsSticker(ctx.chat, media, ctx.m.raw, { packname: ctx.config.sticker.packname, author: ctx.config.sticker.author });
    } else return ctx.reply(`Balas gambar atau video dengan ${ctx.prefix}${ctx.command}.`);
    if (typeof output === 'string') await fs.unlink(output).catch(() => {});
  }
};
