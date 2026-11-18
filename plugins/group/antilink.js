'use strict';

module.exports = {
  name: 'group-antilink',
  commands: ['antilink'],
  category: 'group',
  description: 'Mengaktifkan atau menonaktifkan penghapusan tautan dari anggota non-admin.',
  usage: '.antilink <on|off|status>',
  permissions: { groupOnly: true, adminOnly: true, botAdminOnly: true },
  async execute(ctx) {
    const action = String(ctx.args?.[0] || 'status').toLowerCase();
    if (!['on', 'off', 'status'].includes(action)) {
      return ctx.reply('Format: ' + ctx.prefix + 'antilink <on|off|status>');
    }
    const groups = ctx.services?.groups;
    if (!groups) return ctx.reply('GroupService belum tersedia.');
    if (action !== 'status') await groups.updateSettings(ctx.chat, { antiLink: action === 'on' });
    const profile = await groups.getGroup(ctx.chat);
    return ctx.reply('Anti-link grup ini ' + (profile?.settings?.antiLink ? 'aktif.' : 'nonaktif.') +
      '\nTautan dari anggota non-admin akan dihapus selama bot masih menjadi admin grup.');
  }
};
