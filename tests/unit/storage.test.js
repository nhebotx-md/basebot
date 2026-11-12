'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createStorageService } = require('../../src/core/services/storage.service');

test('storage confines operations to a private real root and refuses symlink roots/files', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'basebot-storage-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const actual = path.join(root, 'actual');
  await fs.mkdir(actual);
  const alias = path.join(root, 'alias');
  await fs.symlink(actual, alias, 'dir');
  const unsafe = createStorageService(alias);
  await assert.rejects(() => unsafe.write(Buffer.from('x'), 'x.bin'), /symlink/i);
  const service = createStorageService(actual);
  const target = await service.write(Buffer.from('safe'), 'safe.txt');
  assert.equal((await service.read('safe.txt')).toString(), 'safe');
  await fs.unlink(target);
  await fs.symlink('/etc/passwd', path.join(actual, 'escape.txt'));
  await assert.rejects(() => service.read('escape.txt'));
});
