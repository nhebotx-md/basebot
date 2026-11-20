'use strict';

function clean(value, max = 300) {
  const text = String(value ?? '').replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, max) : '';
}
function parseGroupTarget(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const link = text.match(/(?:https?:\/\/)?(?:www\.)?chat\.whatsapp\.com\/([A-Za-z0-9_-]{8,64})/i);
  if (link) return { type: 'invite', value: link[1] };
  if (/^\d{5,}(?:-\d+)?@g\.us$/i.test(text)) return { type: 'jid', value: text };
  if (/^[A-Za-z0-9_-]{8,64}$/.test(text)) return { type: 'invite', value: text };
  return null;
}
function formatDate(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '';
  const date = new Date(number < 1e12 ? number * 1000 : number);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }) + ' WIB';
}
function formatGroupInfo(metadata, target) {
  const id = clean(metadata?.id || (target?.type === 'jid' ? target.value : ''), 120);
  const participants = Array.isArray(metadata?.participants) ? metadata.participants.length : null;
  const size = participants ?? (Number.isFinite(Number(metadata?.size)) ? Number(metadata.size) : null);
  const expiry = Number(metadata?.ephemeralDuration) || 0;
  const rows = [
    '╭─〔 *WHATSAPP GROUP INFO* 〕',
    '│ *Nama Grup:* ' + (clean(metadata?.subject || metadata?.name, 100) || 'Tidak tersedia'),
    '│ *ID Grup:*',
    '│ ' + (id || 'Tidak tersedia'),
    '│ *Jumlah Anggota:* ' + (size === null ? 'Tidak disediakan WhatsApp' : size),
    '│ *Owner Grup:* ' + (clean(metadata?.owner || metadata?.subjectOwner, 120) || 'Tidak disediakan WhatsApp'),
    '│ *Dibuat:* ' + (formatDate(metadata?.creation || metadata?.createdAt) || 'Tidak disediakan WhatsApp'),
    '│ *Deskripsi:* ' + (clean(metadata?.desc || metadata?.description, 500) || 'Tidak tersedia'),
    '│ *Pengiriman Pesan:* ' + (metadata?.announce ? 'Hanya admin' : 'Semua anggota'),
    '│ *Edit Info Grup:* ' + (metadata?.restrict ? 'Hanya admin' : 'Semua anggota'),
    '│ *Tambah Anggota:* ' + (metadata?.memberAddMode ? 'Semua anggota' : 'Admin'),
    '│ *Persetujuan Join:* ' + (metadata?.joinApprovalMode ? 'Aktif' : 'Nonaktif'),
    '│ *Pesan Sementara:* ' + (expiry > 0 ? Math.round(expiry / 3600) + ' jam' : 'Nonaktif'),
    '│ *Community:* ' + (metadata?.isCommunity ? 'Ya' : 'Tidak diketahui/tidak'),
    '│ *Community Announcement:* ' + (metadata?.isCommunityAnnounce ? 'Ya' : 'Tidak')
  ];
  if (target?.type === 'invite') rows.push('│ *Kode Invite:* ' + target.value);
  rows.push('╰────────────────────', '_Catatan: metadata bergantung pada akses dan data yang dikirim WhatsApp. Informasi yang tidak tersedia tidak ditebak._');
  return rows.join('\n');
}
module.exports = {
  name: 'group-id-lookup',
  commands: ['idgc', 'cekidgc'],
  category: 'utility',
  description: 'Memeriksa ID dan metadata WhatsApp Group dari grup aktif, JID, tautan invite, atau kode undangan.',
  usage: '.idgc dari dalam grup atau .idgc <link_grup|kode_invite|groupJid>',
  permissions: { metadataRequired: true, registrationExempt: true },
  parseGroupTarget, formatGroupInfo,
  async execute(ctx) {
    const raw = String(ctx.text || '').trim();
    let target = parseGroupTarget(raw);
    let metadata = null;
    if (!raw && ctx.isGroup && /^\d{5,}(?:-\d+)?@g\.us$/i.test(ctx.chat || '')) {
      target = { type: 'jid', value: ctx.chat };
      metadata = ctx.groupMetadata || null;
    }
    if (raw && !target) return ctx.reply('Format tidak valid. Gunakan:\n• ' + ctx.prefix + 'idgc https://chat.whatsapp.com/KODE_INVITE\n• ' + ctx.prefix + 'idgc 120363...@g.us');
    if (!target) return ctx.reply('╭─〔 *CEK ID GRUP* 〕\n│ Gunakan command dari dalam grup untuk mendapatkan ID grup aktif.\n│ Atau kirim tautan/kode invite maupun JID grup sebagai argumen.\n│ Contoh: ' + ctx.prefix + 'idgc https://chat.whatsapp.com/KODE_INVITE\n╰────────────────────');
    if (ctx.progress) await ctx.progress.update('Memeriksa WhatsApp Group', { detail: 'Mengambil metadata grup dari WhatsApp.' });
    try {
      if (target.type === 'invite') {
        if (typeof ctx.client?.groupGetInviteInfo !== 'function') throw new Error('API pemeriksaan invite grup tidak tersedia pada versi Baileys aktif.');
        metadata = await ctx.client.groupGetInviteInfo(target.value);
      } else if (!metadata) {
        if (typeof ctx.client?.groupMetadata !== 'function') throw new Error('API metadata grup tidak tersedia pada versi Baileys aktif.');
        metadata = await ctx.client.groupMetadata(target.value);
      }
      if (!metadata || !metadata.id) return ctx.reply('Grup tidak ditemukan atau metadata tidak dapat diverifikasi. Pastikan tautan masih aktif dan coba lagi.');
      return ctx.reply(formatGroupInfo(metadata, target));
    } catch (error) {
      ctx.logger?.warn?.('Lookup WhatsApp Group gagal.', { command: ctx.command, error: error?.message || String(error) });
      return ctx.reply('Gagal mengambil metadata grup. Pastikan tautan/JID benar, bot memiliki akses yang diperlukan, dan koneksi WhatsApp stabil.\nDetail: ' + clean(error?.message || 'API metadata gagal', 180));
    }
  }
};
