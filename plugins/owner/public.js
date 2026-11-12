'use strict';
module.exports = {
  name: 'public-mode', commands: ['public'], category: 'owner',
  description: 'Mengaktifkan penerimaan command dari pengguna publik.', usage: '.public',
  permissions: { ownerOnly: true },
  async execute(ctx) { ctx.client.public = true; await ctx.reply('Mode public aktif.'); }
};
