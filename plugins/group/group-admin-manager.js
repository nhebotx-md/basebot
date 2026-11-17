'use strict';

function extractCode(value) {
  const text = String(value || '').trim();
  const match = text.match(/(?:chat\.whatsapp\.com\/)([A-Za-z0-9_-]+)/i);
  const code = match?.[1] || text;
  return /^[A-Za-z0-9_-]{8,64}$/.test(code) ? code : '';
}

module.exports = {
  name: 'group-admin-manager',
  commands: ['groupadmin'],
  category: 'management',
  description: 'Mengelola grup, nama, deskripsi, undangan, dan akses grup.',
  usage: '.groupadmin <create|name|desc|invite|revoke|joininfo|join|leave> [data]',
  permissions: { registrationExempt: true },
  async execute(ctx) {
    const [action, ...parts] = String(ctx.text || '').trim().split(/\s+/);
    const value = parts.join(' ').trim();
    const client = ctx.client;
    const reply = text => ctx.reply(text);
    const ownerOnly = () => ctx.isOwner === true;
    const groupAdmin = () => ctx.isGroup === true && ctx.isGroupAdmin === true;
    const botAdmin = () => ctx.isBotAdmin === true;

    if (!action) return reply('Format: .groupadmin <create|name|desc|invite|revoke|joininfo|join|leave> [data]');
    if (action === 'create') {
      if (!ownerOnly()) return reply('Pembuatan grup baru hanya dapat dilakukan owner bot.');
      const mentions = [...new Set((ctx.m?.mentionedJid || []).filter(jid => typeof jid === 'string' && jid.includes('@')))];
      const subject = value.replace(/@\d+/g, '').trim();
      if (!subject || subject.length > 100 || mentions.length < 1 || mentions.length > 10) return reply('Format: .groupadmin create Nama Grup @anggota (1 sampai 10 mention).');
      if (typeof client.groupCreate !== 'function') return reply('API pembuatan grup tidak tersedia pada versi Baileys aktif.');
      const created = await client.groupCreate(subject, mentions);
      return reply('Grup berhasil dibuat.\nNama: ' + subject + '\nID: ' + String(created?.id || 'tidak tersedia'));
    }
    if (action === 'join' || action === 'joininfo') {
      if (!ownerOnly()) return reply('Pemeriksaan dan penggunaan undangan grup hanya dapat dilakukan owner bot.');
      const code = extractCode(value);
      if (!code) return reply('Masukkan kode undangan atau tautan chat.whatsapp.com yang valid.');
      if (action === 'joininfo') {
        if (typeof client.groupGetInviteInfo !== 'function') return reply('API pemeriksaan undangan tidak tersedia.');
        const info = await client.groupGetInviteInfo(code);
        return reply('Informasi undangan grup:\nNama: ' + String(info?.subject || '-') + '\nID: ' + String(info?.id || '-') + '\nAnggota: ' + String(info?.size ?? '-') + '\nCommunity: ' + (info?.isCommunity ? 'Ya' : 'Tidak'));
      }
      if (typeof client.groupAcceptInvite !== 'function') return reply('API bergabung melalui undangan tidak tersedia.');
      const joined = await client.groupAcceptInvite(code);
      return reply('Permintaan bergabung grup diproses.\nID: ' + String(joined || 'tidak tersedia'));
    }
    if (action === 'leave') {
      if (!ownerOnly()) return reply('Hanya owner bot yang dapat memerintahkan bot keluar dari grup.');
      if (!ctx.isGroup || !ctx.chat?.endsWith('@g.us')) return reply('Gunakan .groupadmin leave dari dalam grup.');
      if (typeof client.groupLeave !== 'function') return reply('API keluar grup tidak tersedia.');
      await client.groupLeave(ctx.chat);
      return;
    }
    if (!groupAdmin()) return reply('Perintah ini harus dijalankan oleh admin grup dari dalam grup.');
    if (!botAdmin()) return reply('Bot harus menjadi admin grup untuk mengubah pengaturan atau tautan undangan.');
    if (action === 'name') {
      if (!value || value.length > 100) return reply('Format: .groupadmin name Nama Baru');
      if (typeof client.groupUpdateSubject !== 'function') return reply('API ubah nama grup tidak tersedia.');
      await client.groupUpdateSubject(ctx.chat, value);
      return reply('Nama grup berhasil diperbarui.');
    }
    if (action === 'desc') {
      if (!value || value.length > 500) return reply('Format: .groupadmin desc Deskripsi baru');
      if (typeof client.groupUpdateDescription !== 'function') return reply('API ubah deskripsi grup tidak tersedia.');
      await client.groupUpdateDescription(ctx.chat, value);
      return reply('Deskripsi grup berhasil diperbarui.');
    }
    if (action === 'invite') {
      if (typeof client.groupInviteCode !== 'function') return reply('API tautan undangan tidak tersedia.');
      const code = await client.groupInviteCode(ctx.chat);
      return reply('Tautan undangan grup:\nhttps://chat.whatsapp.com/' + code);
    }
    if (action === 'revoke') {
      if (typeof client.groupRevokeInvite !== 'function') return reply('API reset tautan undangan tidak tersedia.');
      const code = await client.groupRevokeInvite(ctx.chat);
      return reply('Tautan undangan lama telah dicabut.\nTautan baru: https://chat.whatsapp.com/' + code);
    }
    return reply('Subcommand tidak dikenal. Gunakan .groupadmin untuk melihat format.');
  }
};
