'use strict';
module.exports = {
  name: 'sticker-watermark', commands: ['wm', 'swm', 'stickerwm', 'take'], category: 'media',
  description: 'Membuat ulang sticker dengan metadata pack.', usage: '.wm <nama pack>|<pembuat> (balas media)', permissions: {},
  async execute(ctx) {
    if (!ctx.text) return ctx.reply(`Contoh: ${ctx.prefix}${ctx.command} Nama Pack|Pembuat`);
    if (!ctx.quoted || !ctx.mime) return ctx.reply('Balas gambar atau video sticker/media.');
    const [packname = ctx.config.sticker.packname, author = ctx.config.sticker.author] = ctx.text.split('|').map(v => v.trim());
    const options = { packname: packname || ctx.config.sticker.packname, author: author || ctx.config.sticker.author };
    const media = await ctx.quoted.download();
    if (/^image\//.test(ctx.mime) || /webp/.test(ctx.mime)) await ctx.client.sendImageAsSticker(ctx.chat, media, ctx.m.raw, options);
    else if (/^video\//.test(ctx.mime)) {
      if ((ctx.quoted.msg || {}).seconds > 10) return ctx.reply('Durasi video maksimal 10 detik.');
      await ctx.client.sendVideoAsSticker(ctx.chat, media, ctx.m.raw, options);
    } else return ctx.reply('Format yang didukung: gambar, video, atau sticker.');
  }
};
