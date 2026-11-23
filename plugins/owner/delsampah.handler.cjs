'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const EXTENSIONS = new Set(['.gif', '.png', '.mp3', '.mp4', '.jpg', '.jpeg', '.webp', '.webm']);
module.exports = {
  name: 'delete-temp-files', commands: ['delsampah', 'dsampah'], category: 'owner',
  description: 'Menghapus file media sementara di storage/temp.', usage: '.delsampah', permissions: { ownerOnly: true },
  async execute(ctx) {
    const root = path.resolve(ctx.config.paths.temp);
    let names = [];
    try { names = await fs.readdir(root); } catch (error) { if (error.code === 'ENOENT') return ctx.reply('Folder temp belum berisi file.'); throw error; }
    let deleted = 0;
    for (const name of names) {
      if (!EXTENSIONS.has(path.extname(name).toLowerCase())) continue;
      const file = path.resolve(root, name);
      if (!file.startsWith(`${root}${path.sep}`)) continue;
      const stat = await fs.lstat(file);
      if (!stat.isFile() || stat.isSymbolicLink()) continue;
      await fs.unlink(file);
      deleted += 1;
    }
    await ctx.reply(`${deleted} file sementara berhasil dihapus.`);
  }
};
