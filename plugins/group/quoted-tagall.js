'use strict';

module.exports = {
  name: 'group-quoted-tagall',
  commands: ['totag'],
  category: 'group',
  description: 'Mengirim isi pesan yang dibalas dengan mention seluruh anggota grup.',
  usage: '.totag (balas pesan)',
  permissions: { groupOnly: true, adminOnly: true },
  async execute(ctx) {
    const participants = ctx.groupMetadata?.participants;
    if (!Array.isArray(participants) || participants.length === 0) {
      return ctx.reply('Daftar anggota grup tidak tersedia.');
    }
    if (!ctx.quoted) return ctx.reply('Balas pesan yang ingin dikirim ulang dengan mention seluruh anggota.');
    const mentions = [...new Set(participants.map(item => item?.id).filter(id => typeof id === 'string' && id.includes('@')))];
    const quotedText = String(ctx.quoted.text || '').trim();
    if (!quotedText) {
      return ctx.reply('Pesan yang dibalas tidak berisi teks. Untuk saat ini .totag hanya mendukung pesan teks.');
    }
    const text = quotedText.slice(0, 5000) + '\n\n' + mentions.map(jid => '@' + jid.split('@')[0]).join(' ');
    await ctx.sendMessage(ctx.chat, { text, mentions }, { quoted: ctx.m.raw });
  }
};
