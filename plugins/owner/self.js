'use strict';
module.exports = {
  name: 'self-mode', commands: ['self'], category: 'owner',
  description: 'Membatasi command hanya untuk owner.', usage: '.self',
  permissions: { ownerOnly: true },
  async execute(ctx) { ctx.client.public = false; await ctx.reply('Mode self aktif.'); }
};
