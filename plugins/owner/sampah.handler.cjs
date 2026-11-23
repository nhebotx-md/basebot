'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const EXTENSIONS = new Set(['.gif', '.png', '.mp3', '.mp4', '.jpg', '.jpeg', '.webp', '.webm']);
module.exports = {
  name: 'list-temp-files', commands: ['listsampah', 'sampah'], category: 'owner',
  description: 'Menampilkan file media sementara yang dapat dibersihkan.', usage: '.listsampah', permissions: { ownerOnly: true },
  async execute(ctx) {
    const root = path.resolve(ctx.config.paths.temp);
    let names = [];
    try { names = await fs.readdir(root); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const files = [];
    for (const name of names) {
      if (!EXTENSIONS.has(path.extname(name).toLowerCase())) continue;
      const file = path.resolve(root, name);
      if (!file.startsWith(`${root}${path.sep}`)) continue;
      const stat = await fs.lstat(file);
      if (stat.isFile() && !stat.isSymbolicLink()) files.push(name);
    }
    await ctx.reply(`File sementara: ${files.length}\n${files.slice(0, 80).join('\n') || '(kosong)'}${files.length > 80 ? '\n…' : ''}\nGunakan ${ctx.prefix}delsampah untuk menghapusnya.`);
  }
};
