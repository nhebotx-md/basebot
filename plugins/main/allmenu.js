'use strict';

module.exports = {
  name: 'basebot-allmenu',
  commands: ['allmenu'],
  category: 'main',
  description: 'Menampilkan command yang tersedia berdasarkan kategori.',
  usage: '.allmenu',
  permissions: {},
  async execute(ctx) {
    const service = ctx.registry?.menuService;
    if (!service || typeof service.renderAllMenu !== 'function') {
      await ctx.reply('Menu service BASEBOT belum siap. Silakan restart bot atau periksa log startup.');
      return;
    }
    await ctx.reply(service.renderAllMenu(ctx));
  }
};
