'use strict';
module.exports = {
  name: 'group-welcome', commands: ['welcome-status'], category: 'group',
  description: 'Menangani anggota yang bergabung atau keluar dari grup.', usage: '.welcome-status',
  permissions: { ownerOnly: true }, events: ['group-participants.update'],
  async execute(ctx) { await ctx.reply(`Welcome message ${ctx.config.welcomeEnabled ? 'aktif' : 'nonaktif'} melalui konfigurasi.`); },
  async onEvent(ctx, event) {
    if (!ctx.config.welcomeEnabled || !event?.id || !Array.isArray(event.participants)) return;
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
      let text; let mentions = [participant];
      if (event.action === 'add') text = `Selamat datang @${number} di *${subject}*!`;
      else if (event.action === 'remove') text = `@${number} telah keluar dari *${subject}*.`;
      else if (event.action === 'promote' && actor) { text = `@${actorNumber} menjadikan @${number} admin grup *${subject}*.`; mentions = [actor, participant]; }
      else if (event.action === 'demote' && actor) { text = `@${actorNumber} mencabut status admin @${number} di *${subject}*.`; mentions = [actor, participant]; }
      else continue;
      await ctx.client.sendMessage(event.id, { text, mentions });
    }
  }
};
