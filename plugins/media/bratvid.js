'use strict';
module.exports = {
  name: 'brat-video', commands: ['bratvid', 'bratvideo'], category: 'media',
  description: 'Membuat sticker animasi teks gaya Brat.', usage: '.bratvid <teks>', permissions: {},
  async execute(ctx) {
    if (!ctx.text) return ctx.reply(`Contoh: ${ctx.prefix}bratvid halo`);
    if (ctx.text.length > 120) return ctx.reply('Teks maksimal 120 karakter untuk sticker animasi.');
    const url = `https://brat.caliphdev.com/api/brat/animate?text=${encodeURIComponent(ctx.text)}`;
    await ctx.react('⚡');
    await ctx.client.sendVideoAsSticker(ctx.chat, url, ctx.m.raw, { packname: ctx.config.sticker.packname, author: ctx.config.sticker.author });
  }
};
