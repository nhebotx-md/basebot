'use strict';

module.exports = {
  name: 'anti-status-mention',
  commands: ['antiswgc', 'antitagsw'],
  category: 'group',
  description: 'Mengatur penghapusan pesan status WhatsApp yang menandai grup.',
  usage: '.antiswgc <on|off|status>',
  permissions: { groupOnly: true, adminOnly: true, botAdminOnly: true },
  async execute(ctx) {
    const action = String(ctx.args?.[0] || 'status').toLowerCase();
    if (!['on', 'off', 'status'].includes(action)) {
      return ctx.reply('Format: ' + ctx.prefix + 'antiswgc <on|off|status>');
    }
    const groups = ctx.services?.groups;
    if (!groups) return ctx.reply('GroupService belum tersedia.');
    if (action !== 'status') await groups.updateSettings(ctx.chat, { antiStatusMention: action === 'on' });
    const profile = await groups.getGroup(ctx.chat);
    const enabled = profile?.settings?.antiStatusMention !== false;
    return ctx.reply('Anti-status-mention grup ini ' + (enabled ? 'aktif.' : 'nonaktif.') +
      '\nPesan status yang menandai grup akan dihapus ketika fitur aktif.');
  }
};
