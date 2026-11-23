'use strict';

module.exports = {
  name: 'basebot-menu',
  commands: ['menu'],
  category: 'main',
  description: 'Menampilkan dashboard utama dan direktori kategori BASEBOT.',
  usage: '.menu',
  permissions: {},
  async execute(ctx) {
    const service = ctx.registry?.menuService;
    if (!service || typeof service.execute !== 'function') {
      await ctx.reply('Menu service BASEBOT belum siap. Silakan restart bot atau periksa log startup.');
      return;
    }
    await service.execute(ctx);
  }
};
