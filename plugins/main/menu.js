'use strict';

module.exports = {
  name: 'muse-menu',
  commands: ['menu'],
  category: 'main',
  description: 'Menampilkan dashboard utama dan direktori kategori MUSE-MD.',
  usage: '.menu',
  permissions: {},
  async execute(ctx) {
    const service = ctx.registry?.menuService;
    if (!service || typeof service.execute !== 'function') {
      await ctx.reply('Menu service MUSE-MD belum siap. Silakan restart bot atau periksa log startup.');
      return;
    }
    await service.execute(ctx);
  }
};
