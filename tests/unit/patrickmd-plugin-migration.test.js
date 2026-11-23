'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PluginRegistry } = require('../../src/core/plugins/plugin-registry');
const tobotak = require('../../plugins/image/tobotak');
const tochibi = require('../../plugins/image/tochibi');
const setbio = require('../../plugins/owner/setbio');
const block = require('../../plugins/owner/block');
const unblock = require('../../plugins/owner/unblock');
const listgc = require('../../plugins/owner/listgc');
const group = require('../../plugins/group/quoted-tagall');
const makerHandler = require('../../plugins/image/ai-image-transform.handler.cjs');

test('migrated features register as independent command plugins', () => {
  const registry = new PluginRegistry();
  for (const plugin of [tobotak, tochibi, setbio, block, unblock, listgc, group]) registry.register(plugin);
  assert.equal(registry.getByCommand('tobotak').name, 'image-tobotak');
  assert.equal(registry.getByCommand('tochibi').name, 'image-tochibi');
  assert.equal(registry.getByCommand('setbio').name, 'owner-setbio');
  assert.equal(registry.getByCommand('block').name, 'owner-block');
  assert.equal(registry.getByCommand('unblock').name, 'owner-unblock');
  assert.equal(registry.getByCommand('listgc').name, 'owner-listgc');
  assert.equal(registry.getByCommand('totag').name, 'group-quoted-tagall');
  assert.equal(setbio.permissions.ownerOnly, true);
  assert.equal(group.permissions.groupOnly, true);
  assert.equal(group.permissions.adminOnly, true);
});

test('AI image transform validates file signatures and retains its complete handler catalog', () => {
  assert.ok(makerHandler.COMMANDS.length >= 30);
  assert.equal(makerHandler.detectImageFormat(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])), 'png');
  assert.equal(makerHandler.detectImageFormat(Buffer.from([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0])), 'jpeg');
  assert.equal(makerHandler.detectImageFormat(Buffer.from('RIFF0000WEBP')), 'webp');
  assert.equal(makerHandler.detectImageFormat(Buffer.from('GIF89a000000')), 'gif');
  assert.equal(makerHandler.detectImageFormat(Buffer.from('<html>invalid</html>')), null);
});
