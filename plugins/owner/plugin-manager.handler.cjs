'use strict';

function clean(value) {
  return String(value || '').replace(/[\r\n\t]/g, ' ').slice(0, 100);
}

module.exports = {
  name: 'plugin-manager',
  commands: ['plugin', 'plugins'],
  category: 'owner',
  description: 'Mengelola status, informasi, dan reload plugin runtime.',
  usage: '.plugin list',
  permissions: { ownerOnly: true },
  async execute(ctx) {
    if (ctx.isNewsletter || ctx.isChannel) {
      await ctx.reply('Manajemen plugin hanya dapat dijalankan melalui chat pribadi atau grup oleh owner.');
      return;
    }
    if (!ctx.isOwner) {
      await ctx.reply('Fitur ini khusus owner.');
      return;
    }
    const manager = ctx.services?.pluginManager;
    if (!manager) {
      await ctx.reply('Plugin Manager belum tersedia pada runtime ini.');
      return;
    }

    const args = Array.isArray(ctx.args) ? ctx.args : [];
    const action = String(args[0] || 'list').toLowerCase();
    const target = String(args[1] || '').trim();
    const prefix = typeof ctx.prefix === 'string' ? ctx.prefix : '.';
    const usage = [
      '*PLUGIN MANAGER*',
      prefix + 'plugin list',
      prefix + 'plugin info <nama>',
      prefix + 'plugin enable <nama>',
      prefix + 'plugin disable <nama>',
      prefix + 'plugin reload all',
      prefix + 'plugin watch',
      prefix + 'plugin stats'
    ].join('\n');

    if (action === 'list') {
      const plugins = manager.list();
      const lines = ['*DAFTAR PLUGIN* (' + plugins.length + ')', ''];
      for (const item of plugins) {
        lines.push((item.enabled ? '🟢 ' : '⚪ ') + '*' + item.name + '* [' + item.category + ']');
        lines.push('  Command: ' + item.commands.map(command => prefix + command).join(', '));
      }
      lines.push('', 'Gunakan ' + prefix + 'plugin info <nama> untuk detail.');
      await ctx.reply(lines.join('\n'));
      return;
    }

    if (action === 'info') {
      const item = manager.info(target);
      if (!item) {
        await ctx.reply('Plugin "' + clean(target) + '" tidak ditemukan.');
        return;
      }
      await ctx.reply([
        '*PLUGIN: ' + item.name + '*',
        'Status: ' + (item.enabled ? 'Aktif' : 'Nonaktif'),
        'Kategori: ' + clean(item.category),
        'Command: ' + item.commands.map(command => prefix + command).join(', '),
        'Deskripsi: ' + clean(item.description),
        'Penggunaan: ' + clean(item.usage),
        'File: ' + clean(item.filePath)
      ].join('\n'));
      return;
    }

    if (action === 'enable' || action === 'disable') {
      if (!target) {
        await ctx.reply('Nama plugin wajib diisi.\n\n' + usage);
        return;
      }
      const result = action === 'enable' ? await manager.enable(target) : await manager.disable(target);
      if (!result.success) {
        const message = result.reason === 'protected'
          ? 'Plugin Manager tidak boleh dinonaktifkan agar command pengelolaan tetap tersedia.'
          : result.reason === 'persistence-failed'
            ? 'Status plugin gagal disimpan ke database. Perubahan dibatalkan.'
            : 'Plugin "' + clean(target) + '" tidak ditemukan.';
        await ctx.reply(message);
        return;
      }
      await ctx.reply('Plugin *' + result.plugin + '* ' + (action === 'enable' ? 'diaktifkan.' : 'dinonaktifkan.') +
        (result.changed ? '' : ' Status sebelumnya sudah sesuai.'));
      return;
    }

    if (action === 'reload') {
      if (target && target.toLowerCase() !== 'all') {
        await ctx.reply('Versi ini hanya mendukung reload seluruh plugin: ' + prefix + 'plugin reload all');
        return;
      }
      const result = manager.reload();
      if (!result.success) {
        await ctx.reply('Reload dibatalkan. Registry aktif tetap dipertahankan. Periksa log untuk detail validasi plugin.');
        return;
      }
      await ctx.reply('Reload berhasil. ' + result.loaded + ' plugin dimuat ulang; status nonaktif sebelumnya dipertahankan.');
      return;
    }

    if (action === 'watch') {
      const status = manager.watchStatus();
      await ctx.reply([
        '*PLUGIN AUTO RELOAD*',
        'Status: ' + (status.enabled ? 'AKTIF' : 'NONAKTIF'),
        'Direktori dipantau: ' + status.watchingDirectories,
        'Reload sukses/gagal: ' + status.reloads + '/' + status.failures,
        'Reload tertunda: ' + (status.pending ? 'ya' : 'tidak'),
        'Terakhir: ' + (status.lastReloadAt || 'belum ada')
      ].join('\\n'));
      return;
    }

    if (action === 'stats') {
      const stats = manager.stats();
      await ctx.reply([
        '*PLUGIN RUNTIME STATS*',
        'Total plugin: ' + stats.total,
        'Aktif: ' + stats.enabled,
        'Nonaktif: ' + stats.disabled,
        'Command aktif: ' + stats.commands,
        'Kategori: ' + stats.categories,
        'Auto reload: ' + (stats.autoReload?.enabled ? 'ON' : 'OFF'),
        'Reload sukses/gagal: ' + (stats.autoReload?.reloads || 0) + '/' + (stats.autoReload?.failures || 0)
      ].join('\n'));
      return;
    }

    await ctx.reply('Subcommand tidak dikenal.\n\n' + usage);
  }
};
