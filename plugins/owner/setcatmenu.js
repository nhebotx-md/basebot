'use strict';

module.exports = {
  name: 'setcatmenu',
  commands: ['setcatmenu'],
  category: 'owner',
  description: 'Memilih tema tampilan category menu BASEBOT.',
  usage: '.setcatmenu v1|v2|v3|v4|v5',
  permissions: { ownerOnly: true },
  async execute(ctx) {
    const service = ctx.registry?.menuService;
    if (!service || typeof service.setTheme !== 'function') {
      await ctx.reply('Menu theme service belum tersedia. Periksa bootstrap BASEBOT.');
      return;
    }
    await ctx.reply(await service.setTheme(ctx, 'category'));
  }
};
