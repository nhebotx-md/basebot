'use strict';
const axios = require('axios');
module.exports = {
  name: 'qc-sticker', commands: ['qc'], category: 'media',
  description: 'Membuat sticker quote dari teks.', usage: '.qc <teks>', permissions: {},
  async execute(ctx) {
    if (!ctx.text) return ctx.reply(`Contoh: ${ctx.prefix}qc halo`);
    if (ctx.text.length > 500) return ctx.reply('Teks maksimal 500 karakter.');
    const avatar = await ctx.client.profilePictureUrl(ctx.sender, 'image').catch(() => 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png');
    const response = await axios.post('https://bot.lyo.su/quote/generate', {
      type: 'quote', format: 'png', backgroundColor: '#232023', width: 512, height: 768, scale: 2,
      messages: [{ entities: [], avatar: true, from: { id: 1, name: String(ctx.pushname).slice(0, 80), photo: { url: avatar } }, text: ctx.text, replyMessage: {} }]
    }, { timeout: 20000, maxRedirects: 0, maxContentLength: 2 * 1024 * 1024 });
    const encoded = response.data?.result?.image;
    if (typeof encoded !== 'string' || encoded.length > 4 * 1024 * 1024) throw new Error('Layanan quote menghasilkan gambar tidak valid.');
    await ctx.react('⚡');
    await ctx.client.sendImageAsSticker(ctx.chat, Buffer.from(encoded, 'base64'), ctx.m.raw, { packname: ctx.config.sticker.packname, author: ctx.config.sticker.author });
  }
};
