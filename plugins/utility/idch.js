'use strict';

function clean(value, max = 300) {
  const text = String(value ?? '').replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, max) : '';
}
function parseChannelTarget(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const link = text.match(/(?:https?:\/\/)?(?:www\.)?whatsapp\.com\/channel\/([A-Za-z0-9_-]{8,64})/i);
  if (link) return { type: 'invite', value: link[1] };
  if (/^\d{5,}@newsletter$/i.test(text)) return { type: 'jid', value: text };
  if (/^[A-Za-z0-9_-]{8,64}$/.test(text)) return { type: 'invite', value: text };
  return null;
}
async function fetchChannelMetadata(client, target) {
  if (typeof client?.newsletterMetadata !== 'function') throw new Error('API metadata WhatsApp Channel tidak tersedia pada versi Baileys aktif.');
  if (target.type === 'invite') return client.newsletterMetadata('invite', target.value);
  try { return await client.newsletterMetadata('jid', target.value); }
  catch { return client.newsletterMetadata(target.value); }
}
function formatDate(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '';
  const date = new Date(number < 1e12 ? number * 1000 : number);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }) + ' WIB';
}
function subscriberCount(value) {
  if (value !== null && value !== '' && Number.isFinite(Number(value))) return String(Number(value));
  if (value && typeof value === 'object') {
    for (const key of ['total', 'count', 'subscribers']) if (Number.isFinite(Number(value[key]))) return String(Number(value[key]));
  }
  return '';
}
function formatChannelInfo(metadata, target) {
  const id = clean(metadata?.id || (target?.type === 'jid' ? target.value : ''), 120);
  const rows = [
    '╭─〔 *WHATSAPP CHANNEL INFO* 〕',
    '│ *Nama Channel:* ' + (clean(metadata?.name || metadata?.subject, 100) || 'Tidak tersedia'),
    '│ *ID Channel:*',
    '│ ' + (id || 'Tidak tersedia'),
    '│ *Deskripsi:* ' + (clean(metadata?.description || metadata?.desc, 500) || 'Tidak tersedia'),
    '│ *Subscriber:* ' + (subscriberCount(metadata?.subscribers ?? metadata?.subscriberCount) || 'Tidak disediakan WhatsApp'),
    '│ *Status:* ' + (clean(metadata?.state || metadata?.mute_state, 60) || 'Tidak disediakan WhatsApp'),
    '│ *Verifikasi:* ' + (clean(metadata?.verification || metadata?.verified, 60) || 'Tidak diketahui'),
    '│ *Dibuat:* ' + (formatDate(metadata?.creation_time || metadata?.creationTime || metadata?.createdAt) || 'Tidak disediakan WhatsApp')
  ];
  if (target?.type === 'invite') rows.push('│ *Kode Invite:* ' + target.value);
  rows.push('╰────────────────────', '_Catatan: data yang tidak diberikan WhatsApp ditandai tidak tersedia, bukan dianggap nol._');
  return rows.join('\n');
}
module.exports = {
  name: 'channel-id-lookup',
  commands: ['idch', 'cekidch'],
  category: 'utility',
  description: 'Memeriksa ID dan metadata WhatsApp Channel dari tautan, kode invite, JID, atau Channel aktif.',
  usage: '.idch <link_channel|kode_invite|channelJid> atau .idch dari dalam Channel',
  permissions: { registrationExempt: true },
  parseChannelTarget, fetchChannelMetadata, formatChannelInfo,
  async execute(ctx) {
    const raw = String(ctx.text || '').trim();
    let target = parseChannelTarget(raw);
    let metadata = null;
    if (!raw && ctx.isNewsletter && /^\d{5,}@newsletter$/i.test(ctx.chat || '')) {
      target = { type: 'jid', value: ctx.chat };
      metadata = ctx.channelMetadata || null;
    }
    if (raw && !target) return ctx.reply('Format tidak valid. Gunakan:\n• ' + ctx.prefix + 'idch https://whatsapp.com/channel/KODE_INVITE\n• ' + ctx.prefix + 'idch 123456789@newsletter');
    if (!target) return ctx.reply('╭─〔 *CEK ID CHANNEL* 〕\n│ Masukkan tautan Channel, kode invite, atau JID Channel.\n│ Contoh: ' + ctx.prefix + 'idch https://whatsapp.com/channel/0029V...\n│ Dari dalam chat Channel, gunakan ' + ctx.prefix + 'idch tanpa argumen.\n╰────────────────────');
    if (ctx.progress) await ctx.progress.update('Memeriksa WhatsApp Channel', { detail: 'Mengambil metadata Channel dari WhatsApp.' });
    try {
      if (!metadata) metadata = await fetchChannelMetadata(ctx.client, target);
      if (!metadata || !metadata.id) return ctx.reply('Channel tidak ditemukan atau metadata tidak dapat diverifikasi. Pastikan tautan masih aktif dan coba lagi.');
      return ctx.reply(formatChannelInfo(metadata, target));
    } catch (error) {
      ctx.logger?.warn?.('Lookup WhatsApp Channel gagal.', { command: ctx.command, error: error?.message || String(error) });
      return ctx.reply('Gagal mengambil metadata Channel. Pastikan tautan/JID benar, Channel masih aktif, dan koneksi WhatsApp stabil.\nDetail: ' + clean(error?.message || 'API metadata gagal', 180));
    }
  }
};
