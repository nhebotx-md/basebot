'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PluginRegistry } = require('../../src/core/plugins/plugin-registry');
const maker = require('../../plugins/maker/ai-image-transform');
const owner = require('../../plugins/owner/account-tools');
const group = require('../../plugins/group/quoted-tagall');

test('migrated PatrickMD plugins register with unique command ownership', () => {
  const registry = new PluginRegistry();
  registry.register(maker, 'maker/ai-image-transform.js');
  registry.register(owner, 'owner/account-tools.js');
  registry.register(group, 'group/quoted-tagall.js');

  assert.equal(registry.getByCommand('tochibi').name, 'ai-image-transform');
  assert.equal(registry.getByCommand('setbio').name, 'owner-account-tools');
  assert.equal(registry.getByCommand('block').name, 'owner-account-tools');
  assert.equal(registry.getByCommand('unblock').name, 'owner-account-tools');
  assert.equal(registry.getByCommand('listgc').name, 'owner-account-tools');
  assert.equal(registry.getByCommand('totag').name, 'group-quoted-tagall');
  assert.equal(owner.permissions.ownerOnly, true);
  assert.equal(group.permissions.groupOnly, true);
  assert.equal(group.permissions.adminOnly, true);
});

test('AI image transform validates file signatures and exposes no duplicate commands', () => {
  assert.equal(new Set(maker.commands).size, maker.commands.length);
  assert.ok(maker.commands.length >= 30);
  assert.equal(maker.detectImageFormat(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])), 'png');
  assert.equal(maker.detectImageFormat(Buffer.from([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0])), 'jpeg');
  assert.equal(maker.detectImageFormat(Buffer.from('RIFF0000WEBP')), 'webp');
  assert.equal(maker.detectImageFormat(Buffer.from('GIF89a000000')), 'gif');
  assert.equal(maker.detectImageFormat(Buffer.from('<html>invalid</html>')), null);
});
