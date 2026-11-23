'use strict';

const MAX_SHOWN = 30;

module.exports = {
  name: 'group-requests',
  commands: ['joinrequests', 'permintaanmasuk'],
  category: 'group',
  description: 'Menampilkan permintaan bergabung yang masih tertunda.',
  usage: '.joinrequests',
  permissions: { groupOnly: true, adminOnly: true, botAdminOnly: false },
  async execute(ctx) {
    if (String(ctx.text || '').trim()) return ctx.reply('Gunakan .joinrequests tanpa argumen.');
    if (typeof ctx.client?.groupRequestParticipantsList !== 'function') return ctx.reply('Daftar permintaan bergabung belum didukung oleh koneksi bot.');

    let requests;
    try {
      requests = await ctx.client.groupRequestParticipantsList(ctx.chat);
    } catch {
      return ctx.reply('Daftar permintaan tidak dapat diambil saat ini. Pastikan bot memiliki akses ke grup.');
    }
    if (!Array.isArray(requests)) return ctx.reply('Respons daftar permintaan tidak dapat dibaca.');
    const pending = requests
      .map(item => item && (item.jid || item.id))
      .filter(jid => typeof jid === 'string' && jid.includes('@'));
    if (!pending.length) return ctx.reply('Tidak ada permintaan bergabung yang tertunda.');

    const shown = pending.slice(0, MAX_SHOWN);
    const lines = shown.map((jid, index) => `${index + 1}. @${jid.split('@')[0]}`);
    const suffix = pending.length > MAX_SHOWN ? `\n…dan ${pending.length - MAX_SHOWN} permintaan lainnya.` : '';
    return ctx.sendMessage(ctx.chat, {
      text: `*Permintaan bergabung tertunda (${pending.length})*\n${lines.join('\n')}${suffix}`,
      mentions: shown
    });
  }
};
