'use strict';

function parseTarget(value) {
  const text = String(value || '').trim();
  const link = text.match(/(?:whatsapp\.com\/channel\/)([A-Za-z0-9_-]+)/i);
  if (link) return { type: 'invite', value: link[1] };
  if (/^\d+@newsletter$/i.test(text)) return { type: 'jid', value: text };
  if (/^[A-Za-z0-9_-]{8,64}$/.test(text)) return { type: 'invite', value: text };
  return null;
}

async function metadata(client, target) {
  if (typeof client.newsletterMetadata !== 'function') throw new Error('API metadata Channel tidak tersedia.');
  if (target.type === 'invite') return client.newsletterMetadata('invite', target.value);
  try { return await client.newsletterMetadata('jid', target.value); }
  catch { return client.newsletterMetadata(target.value); }
}

module.exports = {
  name: 'newsletter-manager',
  commands: ['newsletter'],
  category: 'owner',
  description: 'Mengelola WhatsApp Channel: follow, mute, metadata, foto, dan subscriber.',
  usage: '.newsletter <info|follow|unfollow|mute|unmute|subscribers|create|rename|description|photo|remove-photo>',
  permissions: { ownerOnly: true, registrationExempt: true },
  async execute(ctx) {
    const [action, ...args] = String(ctx.text || '').trim().split(/\s+/);
    const client = ctx.client;
    const value = args.join(' ').trim();
    const need = name => typeof client[name] === 'function';
    if (!action) return ctx.reply('Format: .newsletter <info|follow|unfollow|mute|unmute|subscribers|create|rename|description|photo|remove-photo>.');

    if (action === 'create') {
      const [name, description = ''] = value.split('|').map(item => item.trim());
      if (!name || name.length > 100 || description.length > 500) return ctx.reply('Format: .newsletter create Nama Channel | Deskripsi');
      if (!need('newsletterCreate')) return ctx.reply('API pembuatan Channel tidak tersedia.');
      const created = await client.newsletterCreate(name, description);
      return ctx.reply('Channel berhasil dibuat.\nNama: ' + name + '\nID: ' + String(created?.id || 'tidak tersedia'));
    }
    if (action === 'photo' || action === 'remove-photo') {
      const target = parseTarget(args[0]);
      if (!target || target.type !== 'jid') return ctx.reply('Format: .newsletter ' + action + ' <channelJid>');
      if (action === 'remove-photo') {
        if (!need('newsletterRemovePicture')) return ctx.reply('API hapus foto Channel tidak tersedia.');
        await client.newsletterRemovePicture(target.value);
        return ctx.reply('Foto Channel berhasil dihapus.');
      }
      if (!ctx.quoted || ctx.quoted.mtype !== 'imageMessage') return ctx.reply('Balas sebuah gambar dengan .newsletter photo <channelJid>.');
      if (!need('newsletterUpdatePicture')) return ctx.reply('API ubah foto Channel tidak tersedia.');
      const buffer = await ctx.quoted.download();
      if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > 10 * 1024 * 1024) return ctx.reply('Gambar kosong atau melebihi batas 10 MB.');
      await client.newsletterUpdatePicture(target.value, buffer);
      return ctx.reply('Foto Channel berhasil diperbarui.');
    }
    if (action === 'rename' || action === 'description') {
      const jid = args[0];
      const text = args.slice(1).join(' ').replace(/^\|/, '').trim();
      if (!/^\d+@newsletter$/i.test(jid || '') || !text || text.length > (action === 'rename' ? 100 : 500)) return ctx.reply('Format: .newsletter ' + action + ' <channelJid> ' + (action === 'rename' ? 'Nama baru' : 'Deskripsi baru'));
      const method = action === 'rename' ? 'newsletterUpdateName' : 'newsletterUpdateDescription';
      if (!need(method)) return ctx.reply('API perubahan metadata Channel tidak tersedia.');
      await client[method](jid, text);
      return ctx.reply('Metadata Channel berhasil diperbarui.');
    }

    const target = parseTarget(value);
    if (!target) return ctx.reply('Masukkan JID Channel atau tautan/kode undangan Channel yang valid.');
    if (action === 'info') {
      const info = await metadata(client, target);
      return ctx.reply('Informasi Channel:\nNama: ' + String(info?.name || info?.subject || '-') + '\nID: ' + String(info?.id || '-') + '\nDeskripsi: ' + String(info?.description || '-') + '\nSubscriber: ' + String(info?.subscribers ?? '-') + '\nStatus: ' + String(info?.mute_state || '-'));
    }
    if (action === 'subscribers') {
      if (target.type !== 'jid' || !need('newsletterSubscribers')) return ctx.reply('Jumlah subscriber hanya tersedia untuk JID Channel yang valid.');
      const result = await client.newsletterSubscribers(target.value);
      return ctx.reply('Informasi subscriber:\n' + JSON.stringify(result).slice(0, 2500));
    }
    const methods = { follow: 'newsletterFollow', unfollow: 'newsletterUnfollow', mute: 'newsletterMute', unmute: 'newsletterUnmute' };
    const method = methods[action];
    if (!method) return ctx.reply('Subcommand Channel tidak dikenal.');
    const info = await metadata(client, target);
    const jid = info?.id || (target.type === 'jid' ? target.value : '');
    if (!jid) return ctx.reply('JID Channel tidak dapat diverifikasi dari metadata.');
    if (!need(method)) return ctx.reply('API ' + action + ' Channel tidak tersedia.');
    await client[method](jid);
    return ctx.reply('Channel berhasil diproses: ' + action + '.');
  }
};
