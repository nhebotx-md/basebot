'use strict';
module.exports = {
  name: 'image-enhancer', commands: ['enhancer', 'unblur', 'enhance', 'hdr', 'hd', 'remini'], category: 'media',
  description: 'Meningkatkan kualitas gambar yang dikutip.', usage: '.remini (balas gambar)', permissions: {},
  async execute(ctx) {
    if (!ctx.quoted) return ctx.reply(`Balas gambar dengan ${ctx.prefix}${ctx.command}.`);
    if (!/^image\\/(jpeg|jpg|png)$/i.test(ctx.mime)) return ctx.reply('Format yang didukung hanya JPEG dan PNG.');
    const active = ctx.client._enhancerJobs || (ctx.client._enhancerJobs = new Set());
    if (active.has(ctx.sender)) return ctx.reply('Permintaan sebelumnya masih diproses.');
    active.add(ctx.sender);
    try {
      const input = await ctx.quoted.download();
      if (!Buffer.isBuffer(input) || input.length > 10 * 1024 * 1024) return ctx.reply('Ukuran gambar maksimal 10 MB.');
      const output = await ctx.services.downloaders.remini(input, 'enhance');
      if (!Buffer.isBuffer(output) || output.length === 0 || output.length > 20 * 1024 * 1024) throw new Error('Respons media tidak valid.');
      await ctx.sendMessage(ctx.chat, { image: output, caption: 'Gambar berhasil ditingkatkan.' }, { quoted: ctx.m.raw });
    } finally { active.delete(ctx.sender); }
  }
};
