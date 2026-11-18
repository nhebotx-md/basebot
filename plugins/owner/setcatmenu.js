'use strict';

module.exports = {
  name: 'setcatmenu',
  commands: ['setcatmenu'],
  category: 'owner',
  description: 'Memilih tema tampilan category menu BASEBOT.',
  usage: '.setcatmenu [v1|v2|v3|v4|v5]',
  permissions: { ownerOnly: true },
  async execute(ctx) {
    const service = ctx.registry?.menuService;
    if (!service || typeof service.setTheme !== 'function') {
      await ctx.reply('Menu theme service belum tersedia. Periksa bootstrap BASEBOT.');
      return;
    }
    if ((ctx.args || []).length) {
      await ctx.reply(await service.setTheme(ctx, 'category'));
      return;
    }

    const versions = service.themeVersions || { v1: 'showcase', v2: 'terminal', v3: 'minimal', v4: 'premium', v5: 'editorial' };
    const current = Object.entries(versions).find(([, theme]) => theme === service.preferences?.categoryTheme)?.[0] || 'v1';
    const buttons = Object.entries(versions).map(([version, theme]) => ({
      text: version.toUpperCase() + ' · ' + theme,
      id: (ctx.prefix || '.') + 'setcatmenu ' + version
    }));
    const richMessage = ctx.services?.richMessage;
    if (typeof richMessage?.sendNativeFlow !== 'function') {
      await ctx.reply(await service.setTheme(ctx, 'category'));
      return;
    }
    await richMessage.sendNativeFlow(ctx.chat, {
      text: 'PENGATURAN CATEGORY MENU\nTema aktif: ' + current.toUpperCase() + ' (' + versions[current] + ')\n\nPilih salah satu versi tema di bawah ini.',
      footer: 'BASEBOT · CATEGORY THEME',
      optionText: 'Pilih tema',
      optionTitle: 'Tema category menu',
      buttons
    });
  }
};
