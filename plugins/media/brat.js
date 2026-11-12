'use strict';
module.exports = {
  name: 'brat', commands: ['sbrat', 'brat'], category: 'media',
  description: 'Membuat sticker teks gaya Brat.', usage: '.brat <teks>', permissions: {},
  async execute(ctx) {
    if (!ctx.text) return ctx.reply(`Contoh: ${ctx.prefix}brat halo`);
    if (ctx.text.length > 300) return ctx.reply('Teks maksimal 300 karakter.');
    const url = `https://brat.caliphdev.com/api/brat?text=${encodeURIComponent(ctx.text)}`;
    await ctx.react('⚡');
    await ctx.client.sendImageAsSticker(ctx.chat, url, ctx.m.raw, { packname: ctx.config.sticker.packname, author: ctx.config.sticker.author });
  }
};
