'use strict';

const MAX_DESCRIPTION_LENGTH = 280;

module.exports = {
  name: 'group-info',
  commands: ['groupinfo', 'grupinfo'],
  category: 'group',
  description: 'Menampilkan informasi grup dan tautan undangan.',
  usage: '.grupinfo',
  permissions: { groupOnly: true, adminOnly: true, botAdminOnly: false },
  async execute(ctx) {
    const metadata = ctx.groupMetadata;
    if (!metadata) return ctx.reply('Informasi grup belum tersedia. Coba lagi sebentar.');

    let inviteLine = 'Tautan undangan: tidak tersedia.';
    if (typeof ctx.client?.groupInviteCode === 'function') {
      try {
        const code = await ctx.client.groupInviteCode(ctx.chat);
        if (typeof code === 'string' && /^[A-Za-z0-9_-]+$/.test(code)) {
          inviteLine = `Tautan undangan: https://chat.whatsapp.com/${code}`;
        }
      } catch {
        inviteLine = 'Tautan undangan tidak dapat diambil saat ini.';
      }
    } else {
      inviteLine = 'Fitur tautan undangan belum tersedia pada koneksi bot.';
    }

    const participants = Array.isArray(metadata.participants) ? metadata.participants : [];
    const expiry = Number(metadata.ephemeralDuration) || 0;
    const disappearing = expiry === 0 ? 'nonaktif' : `${Math.round(expiry / 3600)} jam`;
    const description = typeof metadata.desc === 'string' && metadata.desc.trim()
      ? `\nDeskripsi: ${metadata.desc.trim().slice(0, MAX_DESCRIPTION_LENGTH)}${metadata.desc.trim().length > MAX_DESCRIPTION_LENGTH ? '…' : ''}`
      : '';
    const rows = [
      `*${String(metadata.subject || 'Grup').slice(0, 100)}*`,
      `Jumlah anggota: ${participants.length || Number(metadata.size) || 0}`,
      `Mode pesan: ${metadata.announce ? 'hanya admin' : 'semua anggota'}`,
      `Edit info: ${metadata.restrict ? 'hanya admin' : 'semua anggota'}`,
      `Tambah anggota: ${metadata.memberAddMode ? 'semua anggota' : 'admin'}`,
      `Persetujuan bergabung: ${metadata.joinApprovalMode ? 'aktif' : 'nonaktif'}`,
      `Pesan sementara: ${disappearing}`,
      inviteLine + description
    ];
    return ctx.reply(rows.join('\n'));
  }
};
