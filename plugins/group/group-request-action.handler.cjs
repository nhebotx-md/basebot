'use strict';

function getSingleMention(ctx) {
  const mentions = ctx.m?.mentionedJid;
  if (!Array.isArray(mentions) || mentions.length !== 1 || typeof mentions[0] !== 'string' || !mentions[0].includes('@')) return null;
  return mentions[0];
}

function canonicalJid(value, decodeJid) {
  if (typeof value !== 'string' || !value.includes('@')) return '';
  let decoded = value;
  try { decoded = typeof decodeJid === 'function' ? (decodeJid(value) || value) : value; } catch { decoded = value; }
  const [user, server] = decoded.split('@');
  if (!user || !server) return '';
  return `${user.split(':')[0]}@${server}`.toLowerCase();
}

const USAGE = 'Format: .joinrequest <approve|reject> @pemohon (target wajib mention).';

module.exports = {
  name: 'group-request-action',
  commands: ['joinrequest', 'permintaan'],
  category: 'group',
  description: 'Menyetujui atau menolak permintaan bergabung yang masih tertunda.',
  usage: '.joinrequest <approve|reject> @pemohon',
  permissions: { groupOnly: true, adminOnly: true, botAdminOnly: true },
  async execute(ctx) {
    const args = String(ctx.text || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (args.length !== 1 || !['approve', 'reject'].includes(args[0])) return ctx.reply(USAGE);
    const target = getSingleMention(ctx);
    if (!target) return ctx.reply('Sebut tepat satu pemohon dengan mention; nomor atau teks biasa tidak digunakan sebagai target.');

    const client = ctx.client;
    if (typeof client?.groupRequestParticipantsList !== 'function' || typeof client?.groupRequestParticipantsUpdate !== 'function') {
      return ctx.reply('Fitur permintaan bergabung belum tersedia pada koneksi bot.');
    }

    let pending;
    try {
      pending = await client.groupRequestParticipantsList(ctx.chat);
    } catch {
      return ctx.reply('Daftar permintaan tertunda tidak dapat diperiksa. Tidak ada perubahan yang dilakukan.');
    }
    if (!Array.isArray(pending)) return ctx.reply('Daftar permintaan tidak dapat dibaca. Tidak ada perubahan yang dilakukan.');

    const targetKey = canonicalJid(target, client.decodeJid);
    const isPending = targetKey && pending.some(item => canonicalJid(item?.jid || item?.id, client.decodeJid) === targetKey);
    if (!isPending) return ctx.reply('Pemohon tersebut tidak ditemukan pada daftar permintaan tertunda. Tidak ada perubahan yang dilakukan.');

    try {
      const result = await client.groupRequestParticipantsUpdate(ctx.chat, [target], args[0]);
      if (Array.isArray(result) && result.some(item => item?.status && String(item.status) !== '200')) {
        return ctx.reply('WhatsApp tidak dapat memproses permintaan tersebut. Periksa kembali daftar permintaan.');
      }
      return ctx.reply(args[0] === 'approve' ? 'Permintaan bergabung disetujui.' : 'Permintaan bergabung ditolak.');
    } catch {
      return ctx.reply('Permintaan tidak berhasil diproses. Pastikan bot masih admin dan coba lagi.');
    }
  }
};
