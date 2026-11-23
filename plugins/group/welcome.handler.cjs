'use strict';

module.exports = {
  name: 'group-welcome',
  commands: ['welcome', 'welcome-status'],
  category: 'group',
  description: 'Mengatur dan menangani pesan sambutan serta notifikasi anggota grup.',
  usage: '.welcome <on|off|status>',
  permissions: { groupOnly: true, adminOnly: true },
  events: ['group-participants.update'],
  async execute(ctx) {
    const action = String(ctx.args?.[0] || 'status').toLowerCase();
    if (!['on', 'off', 'status'].includes(action)) {
      return ctx.reply('Format: ' + ctx.prefix + 'welcome <on|off|status>');
    }
    const groups = ctx.services?.groups;
    if (!groups) return ctx.reply('GroupService belum tersedia.');
    if (action !== 'status') {
      await groups.updateSettings(ctx.chat, { welcome: action === 'on' });
    }
    const profile = await groups.getGroup(ctx.chat);
    const enabled = profile?.settings?.welcome !== false && ctx.config.welcomeEnabled !== false;
    return ctx.reply('Welcome message grup ini ' + (enabled ? 'aktif.' : 'nonaktif.') +
      (ctx.config.welcomeEnabled === false ? '\nCatatan: WELCOME_ENABLED=false mematikan welcome secara global.' : ''));
  },
  async onEvent(ctx, event) {
    if (!event?.id || !Array.isArray(event.participants)) return;
    const profile = await ctx.services?.groups?.getGroup(event.id);
    if (profile?.settings?.welcome === false || ctx.config.welcomeEnabled === false) return;
    const metadata = await ctx.client.groupMetadata(event.id);
    const subject = metadata?.subject || 'grup ini';
    const decode = ctx.client.decodeJid || (jid => jid);
    const bot = decode(ctx.client.user?.id || '');
    const actor = event.author ? decode(event.author) : null;
    for (const item of event.participants) {
      const participant = typeof item === 'string' ? item : item?.id;
      if (!participant || decode(participant) === bot) continue;
      const number = decode(participant).split('@')[0];
      const actorNumber = actor?.split('@')[0];
      let text;
      let mentions = [participant];
      if (event.action === 'add') text = 'Selamat datang @' + number + ' di *' + subject + '*!';
      else if (event.action === 'remove') text = '@' + number + ' telah keluar dari *' + subject + '*.';
      else if (event.action === 'promote' && actor) {
        text = '@' + actorNumber + ' menjadikan @' + number + ' admin grup *' + subject + '*.';
        mentions = [actor, participant];
      } else if (event.action === 'demote' && actor) {
        text = '@' + actorNumber + ' mencabut status admin @' + number + ' di *' + subject + '*.';
        mentions = [actor, participant];
      } else continue;
      await ctx.client.sendMessage(event.id, { text, mentions });
    }
  }
};
