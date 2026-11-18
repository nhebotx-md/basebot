'use strict';

function resolveTarget(ctx) {
  const mentioned = Array.isArray(ctx.m?.mentionedJid) ? ctx.m.mentionedJid[0] : null;
  if (typeof mentioned === 'string' && /^\d{5,20}@s\.whatsapp\.net$/.test(mentioned)) return mentioned;
  const number = String(ctx.args?.[0] || '').replace(/\D/g, '');
  return /^\d{8,16}$/.test(number) ? number + '@s.whatsapp.net' : '';
}

module.exports = {
  name: 'owner-account-tools',
  commands: ['setbio', 'setname', 'setthumb', 'block', 'unblock', 'listgc'],
  category: 'owner',
  description: 'Pengaturan profil bot, daftar grup, dan blokir kontak.',
  usage: '.setbio <teks> | .setname <nama> | .setthumb (balas gambar) | .block @user | .unblock @user | .listgc',
  permissions: { ownerOnly: true },
  async execute(ctx) {
    const client = ctx.client;
    if (ctx.command === 'setbio') {
      const bio = String(ctx.text || '').trim();
      if (!bio) return ctx.reply('Masukkan bio baru. Contoh: ' + ctx.prefix + 'setbio Bot WhatsApp');
      if (bio.length > 139) return ctx.reply('Bio maksimal 139 karakter.');
      if (typeof client.updateProfileStatus !== 'function') return ctx.reply('API pembaruan bio tidak tersedia pada koneksi Baileys ini.');
      await client.updateProfileStatus(bio);
      return ctx.reply('Bio profil WhatsApp bot berhasil diperbarui.');
    }

    if (ctx.command === 'setname') {
      const name = String(ctx.text || '').trim();
      if (!name) return ctx.reply('Masukkan nama profil bot. Contoh: ' + ctx.prefix + 'setname BASEBOT');
      if (name.length > 25) return ctx.reply('Nama profil WhatsApp maksimal 25 karakter.');
      if (typeof client.updateProfileName !== 'function') return ctx.reply('API pembaruan nama profil tidak tersedia pada koneksi Baileys ini.');
      await client.updateProfileName(name);
      return ctx.reply('Nama profil WhatsApp bot berhasil diperbarui.');
    }

    if (ctx.command === 'setthumb') {
      if (!ctx.quoted || !String(ctx.mime || '').toLowerCase().startsWith('image/')) return ctx.reply('Balas gambar dengan command ' + ctx.prefix + 'setthumb.');
      if (typeof client.updateProfilePicture !== 'function') return ctx.reply('API pembaruan foto profil tidak tersedia pada koneksi Baileys ini.');
      const image = await ctx.quoted.download();
      if (!Buffer.isBuffer(image) || image.length === 0 || image.length > 5 * 1024 * 1024) {
        return ctx.reply('Gambar kosong atau melebihi batas 5 MB.');
      }
      const jid = client.user?.id;
      if (!jid) return ctx.reply('Identitas akun bot belum tersedia.');
      await client.updateProfilePicture(jid, image);
      return ctx.reply('Foto profil WhatsApp bot berhasil diperbarui.');
    }

    if (ctx.command === 'block' || ctx.command === 'unblock') {
      const target = resolveTarget(ctx);
      if (!target) return ctx.reply('Sebut satu kontak atau masukkan nomor internasional. Contoh: ' + ctx.prefix + ctx.command + ' 6281234567890');
      if (typeof client.updateBlockStatus !== 'function') return ctx.reply('API pengelolaan blokir tidak tersedia pada koneksi Baileys ini.');
      await client.updateBlockStatus(target, ctx.command === 'block' ? 'block' : 'unblock');
      return ctx.reply('Kontak @' + target.split('@')[0] + (ctx.command === 'block' ? ' berhasil diblokir.' : ' berhasil dibuka blokirnya.'), { mentions: [target] });
    }

    if (ctx.command === 'listgc') {
      if (typeof client.groupFetchAllParticipating !== 'function') return ctx.reply('API daftar grup tidak tersedia pada koneksi Baileys ini.');
      const result = await client.groupFetchAllParticipating();
      const groups = Object.values(result || {}).filter(group => group?.id);
      if (!groups.length) return ctx.reply('Bot belum tergabung dalam grup mana pun.');
      const lines = groups.slice(0, 50).map((group, index) =>
        (index + 1) + '. ' + String(group.subject || 'Grup tanpa nama').replace(/[\r\n]/g, ' ').slice(0, 90) +
        '\n   ' + group.id + ' · ' + (Array.isArray(group.participants) ? group.participants.length : '?') + ' anggota'
      );
      return ctx.reply('*DAFTAR GRUP BOT* (' + groups.length + ')\n\n' + lines.join('\n') +
        (groups.length > 50 ? '\n\nMenampilkan 50 grup pertama.' : ''));
    }
  }
};
