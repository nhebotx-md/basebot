'use strict';

const { getPluginProgress } = require('../../src/core/services/plugin-progress.service');
module.exports = {
  name: 'brat-video', commands: ['bratvid', 'bratvideo'], category: 'media',
  description: 'Membuat sticker animasi teks gaya Brat.', usage: '.bratvid <teks>', permissions: {},
  async execute(ctx) {
    const progress = getPluginProgress(ctx);
    if (!ctx.text) return ctx.reply(`Contoh: ${ctx.prefix}bratvid halo`);
    if (ctx.text.length > 120) return ctx.reply('Teks maksimal 120 karakter untuk sticker animasi.');
    const url = `https://brat.caliphdev.com/api/brat/animate?text=${encodeURIComponent(ctx.text)}`;
    await progress.start('Membuat animasi Brat', { detail: 'Mengirim teks ke layanan pembuat animasi.' });
    await progress.update('Mengonversi animasi menjadi sticker', { detail: 'Menyiapkan hasil animasi untuk WhatsApp.' });
    await ctx.client.sendVideoAsSticker(ctx.chat, url, ctx.m.raw, { packname: ctx.config.sticker.packname, author: ctx.config.sticker.author });
  }
};