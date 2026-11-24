'use strict';

module.exports = {
  name: 'setmenu',
  commands: ['setmenu'],
  category: 'owner',
  description: 'Mengubah tema tampilan menu utama MUSE-MD.',
  usage: '.setmenu v1|v2|v3|v4|v5',
  permissions: { ownerOnly: true },
  async execute(ctx) {
    const service = ctx.registry?.menuService;
    if (!service || typeof service.setTheme !== 'function') {
      await ctx.reply('Menu theme service belum tersedia. Periksa bootstrap MUSE-MD.');
      return;
    }
    await ctx.reply(await service.setTheme(ctx, 'menu'));
  }
};
