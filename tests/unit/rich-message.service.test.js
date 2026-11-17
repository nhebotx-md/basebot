'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createRichMessageService } = require('../../src/core/services/rich-message.service');

test('rich message builder sends code, table, links, rich response, carousel, and native flow payloads', async () => {
  const calls = [];
  const service = createRichMessageService(async (...args) => { calls.push(args); return 'sent'; });
  await service.sendCode('chat', { language: 'javascript', code: 'console.log(1)' });
  await service.sendTable('chat', { rows: [['Name', 'Value'], ['A', '1']] });
  await service.sendRichResponse('chat', { items: [{ text: 'Intro' }, { language: 'javascript', code: [{ highlightType: 0, codeContent: '1+1' }] }] });
  await service.sendCarousel('chat', { text: 'Cards', cards: [{ image: Buffer.from('one'), caption: 'One' }, { image: Buffer.from('two'), caption: 'Two' }] });
  await service.sendNativeFlow('chat', { buttons: [{ text: 'Open', id: '#open' }, { text: 'Copy', copy: 'code' }] });
  assert.equal(calls.length, 5);
  assert.equal(calls[0][1].code, 'console.log(1)');
  assert.equal(calls[1][1].table.length, 2);
  assert.equal(calls[2][1].richResponse.length, 2);
  assert.equal(calls[3][1].cards.length, 2);
  assert.equal(calls[4][1].nativeFlow.length, 2);
});

test('rich message builder rejects malformed tables, unsupported languages, and private URLs', async () => {
  const service = createRichMessageService(async () => 'sent');
  assert.throws(() => service.sendCode('chat', { language: 'brainfuck', code: 'x' }), /Bahasa/);
  await assert.rejects(service.sendTable('chat', { rows: [['A', 'B'], ['1']] }), /Struktur tabel/);
  await assert.rejects(service.sendLinks('chat', { links: [{ text: 'Local', url: 'http://127.0.0.1/admin' }] }), /private|privat|IP/i);
  await assert.rejects(service.sendCarousel('chat', { cards: [{ image: Buffer.from('only') }] }), /2 sampai 10/);
  await assert.rejects(service.sendCarousel('chat', { cards: [{ image: 'http://127.0.0.1/image.png' }, { image: Buffer.from('two') }] }), /privat|private|tidak publik/i);
});
