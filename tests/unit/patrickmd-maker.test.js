'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const plugin = require('../../plugins/maker/ai-image-transform');

test('PatrickMD AI image transform registers all non-empty transform commands', () => {
  assert.equal(plugin.category, 'maker');
  assert.ok(plugin.commands.length >= 30);
  assert.equal(new Set(plugin.commands).size, plugin.commands.length);
  assert.ok(plugin.commands.includes('toviking'));
  assert.ok(plugin.commands.includes('toputih'));
});

test('image signature validation accepts supported image formats only', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const webp = Buffer.from('RIFF0000WEBP');
  const gif = Buffer.from('GIF89a000000');
  assert.equal(plugin.detectImageFormat(png), 'png');
  assert.equal(plugin.detectImageFormat(jpeg), 'jpeg');
  assert.equal(plugin.detectImageFormat(webp), 'webp');
  assert.equal(plugin.detectImageFormat(gif), 'gif');
  assert.equal(plugin.detectImageFormat(Buffer.from('<html>nope</html>')), null);
  assert.equal(plugin.detectImageFormat(Buffer.alloc(0)), null);
});
