'use strict';

module.exports = {
  name: 'owner-getplugin',
  commands: ['getplugin'],
  category: 'owner',
  description: 'Mengambil source dan metadata plugin yang sudah terpasang.',
  usage: '.getplugin <nama-plugin|command>',
  permissions: { ownerOnly: true },
  async execute(ctx) {
    if (ctx.isNewsletter || ctx.isChannel) return ctx.reply('Pengelolaan plugin hanya tersedia di chat pribadi atau grup.');
    if (!ctx.isOwner) return ctx.reply('Fitur ini khusus owner.');
    const query = String(ctx.args?.[0] || '').trim();
    if (!query) return ctx.reply('Gunakan .getplugin <nama-plugin|command>.');
    const manager = ctx.services?.pluginManager;
    if (!manager || typeof manager.getSource !== 'function') return ctx.reply('Plugin Manager belum tersedia.');
    let item;
    try { item = await manager.getSource(query); } catch { return ctx.reply('Source plugin gagal dibaca dari direktori.'); }
    if (!item) return ctx.reply('Plugin tidak ditemukan: ' + query.replace(/[\r\n]/g, '').slice(0, 80));
    const header = ['*SOURCE PLUGIN*', 'Nama: ' + item.name, 'Kategori: ' + item.category, 'Command: ' + item.commands.map(command => '.' + command).join(', '), 'Status: ' + (item.enabled ? 'aktif' : 'nonaktif'), 'File: plugins/' + item.filePath, '', '```javascript'].join('\n');
    const limit = 6000;
    const chunks = item.source.match(new RegExp('[\\s\\S]{1,' + limit + '}', 'g')) || [''];
    await ctx.reply(header + chunks[0] + (chunks.length > 1 ? '\n// Source dibagi menjadi ' + chunks.length + ' bagian.' : '') + '\n```');
    for (let index = 1; index < chunks.length; index++) await ctx.reply('*SOURCE PLUGIN ' + (index + 1) + '/' + chunks.length + '*\n```javascript\n' + chunks[index] + '\n```');
  }
};
