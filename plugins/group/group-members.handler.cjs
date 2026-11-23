'use strict';

function getSingleMention(ctx) {
  const mentions = ctx.m?.mentionedJid;
  if (!Array.isArray(mentions) || mentions.length !== 1 || typeof mentions[0] !== 'string' || !mentions[0].includes('@')) return null;
  return mentions[0];
}

const USAGE = [
  'Format: .anggota <add|remove|promote|demote> @anggota',
  'Target wajib disebut (mention) dalam pesan.'
].join('\n');
const ACTIONS = {
  add: { api: 'add', label: 'ditambahkan ke grup' },
  remove: { api: 'remove', label: 'dikeluarkan dari grup' },
  promote: { api: 'promote', label: 'dijadikan admin' },
  demote: { api: 'demote', label: 'status adminnya dicabut' }
};

module.exports = {
  name: 'group-members',
  commands: ['anggota', 'groupmember'],
  category: 'group',
  description: 'Menambah, mengeluarkan, atau mengubah peran anggota grup.',
  usage: '.anggota <add|remove|promote|demote> @anggota',
  permissions: { groupOnly: true, adminOnly: true, botAdminOnly: true },
  async execute(ctx) {
    const args = String(ctx.text || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (args.length !== 1 || !ACTIONS[args[0]]) return ctx.reply(USAGE);
    const target = getSingleMention(ctx);
    if (!target) return ctx.reply('Sebut tepat satu anggota dengan mention; nomor atau teks biasa tidak digunakan sebagai target.');
    if (typeof ctx.client?.groupParticipantsUpdate !== 'function') return ctx.reply('Manajemen anggota belum tersedia pada koneksi bot.');

    try {
      await ctx.client.groupParticipantsUpdate(ctx.chat, [target], ACTIONS[args[0]].api);
      return ctx.reply(`Permintaan untuk ${ACTIONS[args[0]].label} telah dikirim.`);
    } catch {
      return ctx.reply('Permintaan anggota tidak berhasil. Pastikan bot masih admin dan target dapat diproses.');
    }
  }
};
