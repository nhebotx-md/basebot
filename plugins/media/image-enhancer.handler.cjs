'use strict';

const { getPluginProgress } = require('../../src/core/services/plugin-progress.service');
module.exports = {
  name: 'image-enhancer', commands: ['enhancer', 'unblur', 'enhance', 'hdr', 'hd', 'remini'], category: 'maker',
  description: 'Meningkatkan kualitas gambar yang dikutip.', usage: '.remini (balas gambar)', permissions: {},
  async execute(ctx) {
    const progress = getPluginProgress(ctx);
    if (!ctx.quoted) return ctx.reply(`Balas gambar dengan ${ctx.prefix}${ctx.command}.`);
    if (!/^image\/(jpeg|jpg|png)$/i.test(ctx.mime)) return ctx.reply('Format yang didukung hanya JPEG dan PNG.');
    const active = ctx.client._enhancerJobs || (ctx.client._enhancerJobs = new Set());
    if (active.has(ctx.sender)) return ctx.reply('Permintaan sebelumnya masih diproses.');
    active.add(ctx.sender);
    try {
      await progress.start('Mengambil gambar sumber', { detail: 'Mengunduh gambar yang kamu balas.' });
      const input = await ctx.quoted.download();
      if (!Buffer.isBuffer(input) || input.length > 10 * 1024 * 1024) { await progress.fail('Gambar tidak dapat diproses', { detail: 'Ukuran gambar maksimal 10 MB.' }); return ctx.reply('Ukuran gambar maksimal 10 MB.'); }
      await progress.update('Meningkatkan kualitas gambar', { detail: 'Mengirim gambar ke layanan enhancer dan menunggu hasil.' });
      const output = await ctx.services.downloaders.remini(input, 'enhance');
      if (!Buffer.isBuffer(output) || output.length === 0 || output.length > 20 * 1024 * 1024) throw new Error('Respons media tidak valid.');
      await progress.update('Mengirim hasil enhancement', { detail: 'Hasil sudah divalidasi dan sedang dikirim.' });
      await ctx.sendMessage(ctx.chat, { image: output, caption: 'Gambar berhasil ditingkatkan.' }, { quoted: ctx.m.raw });
    } finally { active.delete(ctx.sender); }
  }
};