'use strict';

module.exports = {
  name: 'muse-catmenu',
  commands: ['catmenu'],
  category: 'main',
  description: 'Menampilkan daftar fitur berdasarkan kategori yang dipilih.',
  usage: '.catmenu <kategori>',
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
