'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { containsExternalLink } = require('../../src/core/events/anti-link');
const antiLink = require('../../plugins/group/antilink');
const welcome = require('../../plugins/group/welcome');
const bratfoto = require('../../plugins/maker/brat-foto');

test('anti-link detection catches common external URLs without matching ordinary text', () => {
  for (const value of [
    'https://example.com/path',
    'www.example.com',
    'chat.whatsapp.com/AbCdEf123',
    'wa.me/628123456789',
    't.me/example',
    'https://bit.ly/example'
  ]) assert.equal(containsExternalLink(value), true, value);
  assert.equal(containsExternalLink('ini pesan biasa tanpa tautan'), false);
  assert.equal(containsExternalLink(''), false);
});

test('PatrickMD group controls and Bratfoto plugin register in their intended categories', () => {
  assert.equal(antiLink.category, 'group');
  assert.deepEqual(antiLink.commands, ['antilink']);
  assert.equal(antiLink.permissions.groupOnly, true);
  assert.equal(antiLink.permissions.adminOnly, true);
  assert.equal(welcome.category, 'group');
  assert.ok(welcome.commands.includes('welcome'));
  assert.equal(bratfoto.category, 'maker');
  assert.deepEqual(bratfoto.commands, ['bratfoto']);
});

test('Bratfoto validates returned image signatures and text length', () => {
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(1024)]);
  assert.equal(bratfoto.isImageBuffer(png), true);
  assert.equal(bratfoto.isImageBuffer(Buffer.from('<html>not an image</html>')), false);
  assert.equal(bratfoto.MAX_TEXT_LENGTH, 150);
});
