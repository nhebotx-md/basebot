'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { constants } = require('node:fs');

function createStorageService(rootDirectory) {
  const root = path.resolve(rootDirectory);
  async function ensureRoot() {
    await fs.mkdir(root, { recursive: true, mode: 0o700 });
    const stat = await fs.lstat(root);
    if (!stat.isDirectory() || stat.isSymbolicLink() || await fs.realpath(root) !== root) throw new Error('Root storage tidak aman atau berupa symlink.');
    await fs.chmod(root, 0o700);
  }
  function resolveName(name) {
    const raw = String(name || '');
    const safeName = path.basename(raw).replace(/[^a-z0-9._-]/gi, '_').slice(0, 100);
    if (!safeName || safeName === '.' || safeName === '..' || raw !== path.basename(raw)) throw new Error('Nama file tidak valid.');
    const target = path.resolve(root, safeName);
    if (!target.startsWith(`${root}${path.sep}`)) throw new Error('Akses di luar direktori storage ditolak.');
    return target;
  }
  return Object.freeze({
    async write(buffer, name = `${crypto.randomBytes(12).toString('hex')}.bin`) {
      if (!Buffer.isBuffer(buffer)) throw new TypeError('Storage hanya menerima Buffer.');
      await ensureRoot();
      const target = resolveName(name);
      await fs.writeFile(target, buffer, { flag: 'wx', mode: 0o600 });
      return target;
    },
    async remove(name) { await ensureRoot(); await fs.unlink(resolveName(name)); },
    async read(name, maxBytes = 20 * 1024 * 1024) {
      await ensureRoot();
      const target = resolveName(name);
      const file = await fs.open(target, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
      try {
        const stat = await file.stat();
        if (!stat.isFile() || stat.size > maxBytes) throw new Error('File tidak tersedia atau melebihi batas ukuran.');
        return await file.readFile();
      } finally { await file.close(); }
    }
  });
}
module.exports = { createStorageService };
