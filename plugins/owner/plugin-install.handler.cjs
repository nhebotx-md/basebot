'use strict';

module.exports = {
  name: 'owner-addplugin',
  commands: ['addplugin'],
  category: 'owner',
  description: 'Memasang atau memperbarui plugin dari URL source JavaScript.',
  usage: '.addplugin <url> | .addplugin custom <kategori> <url>',
  permissions: { ownerOnly: true },
  async execute(ctx) {
    if (ctx.isNewsletter || ctx.isChannel) return ctx.reply('Pengelolaan plugin hanya tersedia di chat pribadi atau grup.');
    if (!ctx.isOwner) return ctx.reply('Fitur ini khusus owner.');
    const manager = ctx.services?.pluginManager;
    if (!manager || typeof manager.addPluginFromUrl !== 'function') return ctx.reply('Plugin installer belum tersedia.');
    const args = Array.isArray(ctx.args) ? ctx.args : [];
    const custom = String(args[0] || '').toLowerCase() === 'custom';
    const category = custom ? String(args[1] || '').toLowerCase() : null;
    const url = custom ? args[2] : args[0];
    if (!url) return ctx.reply('Format penggunaan:\n.addplugin <raw-url-plugin.js>\n.addplugin custom <kategori> <raw-url-plugin.js>');
    await ctx.progress?.start?.('Mengambil source plugin', { detail: 'Memeriksa URL dan metadata plugin.' });
    const result = await manager.addPluginFromUrl(url, { category });
    if (!result.success) {
      const messages = {
        'invalid-url': 'URL harus berupa HTTPS publik yang valid.',
        'download-failed': 'Source plugin gagal diunduh. Pastikan URL dapat diakses langsung.',
        'invalid-response': 'Server tidak mengirim source JavaScript yang valid atau ukurannya melewati batas 256 KB.',
        'invalid-source': 'Source plugin kosong atau tidak valid.',
        'invalid-category': 'Kategori tidak valid. Gunakan huruf kecil, angka, tanda hubung, atau garis bawah.',
        'one-command-required': 'Plugin harus mendaftarkan tepat satu command.',
        'validation-failed': 'Plugin ditolak karena metadata atau struktur plugin tidak sesuai API BaseBot.',
        'multiple-conflicts': 'Nama plugin dan command bertabrakan dengan lebih dari satu plugin.',
        'file-already-exists': 'File tujuan sudah ada tetapi bukan plugin terdaftar. Tidak ditimpa.',
        'protected-plugin': 'Command inti pengelola plugin dilindungi dan tidak dapat ditimpa melalui installer.',
        'reload-validation-failed': 'Pemasangan dibatalkan. File dan registry lama dipulihkan karena validasi reload gagal.'
      };
      const message = messages[result.reason] || 'Plugin gagal dipasang.';
      await ctx.progress?.fail?.('Plugin gagal dipasang', { detail: message });
      return ctx.reply(message);
    }
    await ctx.progress?.complete?.('Plugin berhasil dipasang');
    return ctx.reply([
      result.overwritten ? '*PLUGIN BERHASIL DI-OVERWRITE*' : '*PLUGIN BARU BERHASIL DIPASANG*',
      'Nama: ' + result.plugin,
      'Kategori: ' + result.category,
      'Command: .' + result.command,
      'File: plugins/' + result.filePath,
      'Status: aktif dan sudah dimuat ulang'
    ].join('\n'));
  }
};
