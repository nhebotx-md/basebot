'use strict';
module.exports = {
  name: 'tagall', commands: ['tagall'], category: 'group',
  description: 'Menyebut seluruh anggota grup.', usage: '.tagall [pesan]',
  permissions: { groupOnly: true, adminOnly: true, ownerAdminBypass: false },
  async execute(ctx) {
    const participants = ctx.groupMetadata?.participants;
    if (!Array.isArray(participants) || participants.length === 0) return ctx.reply('Daftar anggota grup tidak tersedia.');
    const mentions = participants.map(item => item.id).filter(Boolean);
    const message = `*Pesan untuk seluruh anggota*${ctx.text ? `\n${ctx.text}` : ''}\n\n${mentions.map(jid => `@${jid.split('@')[0]}`).join('\n')}`;
    await ctx.sendMessage(ctx.chat, { text: message, mentions }, { quoted: ctx.m.raw });
  }
};
