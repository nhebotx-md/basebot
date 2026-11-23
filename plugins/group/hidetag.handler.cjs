'use strict';
module.exports = {
  name: 'hidetag', commands: ['hidetag', 'h'], category: 'group',
  description: 'Mengirim pesan dengan mention seluruh anggota grup.', usage: '.hidetag [pesan]',
  permissions: { groupOnly: true, adminOnly: true },
  async execute(ctx) {
    const participants = ctx.groupMetadata?.participants;
    if (!Array.isArray(participants) || participants.length === 0) return ctx.reply('Daftar anggota grup tidak tersedia.');
    const mentions = participants.map(item => item.id).filter(Boolean);
    if (ctx.quoted?.raw) {
      await ctx.sendMessage(ctx.chat, { forward: ctx.quoted.raw, force: true, mentions });
      return;
    }
    await ctx.sendMessage(ctx.chat, { text: ctx.text || '\u200b', mentions }, { quoted: ctx.m.raw });
  }
};
