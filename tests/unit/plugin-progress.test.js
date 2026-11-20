'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createPluginProgress } = require('../../src/core/services/plugin-progress.service');

function createClient({ fail = false } = {}) {
  const calls = [];
  return {
    calls,
    async sendMessage(chat, content, options) {
      calls.push({ chat, content, options });
      if (fail) throw new Error('transport unavailable');
      return content.text ? { key: { remoteJid: chat, id: 'progress-status' } } : {};
    }
  };
}

const message = { chat: '628000000000@s.whatsapp.net', key: { remoteJid: '628000000000@s.whatsapp.net', id: 'incoming' }, raw: { key: { id: 'incoming' } } };

test('plugin progress begins with the invoked command as a WhatsApp blockquote', async () => {
  const client = createClient();
  const progress = createPluginProgress({
    client, message, plugin: { name: 'tiktok' }, command: 'tt', commandLabel: '.tt'
  });
  await progress.start('Memvalidasi tautan');
  assert.match(client.calls[0].content.text, /^> \.tt\n\n╭─〔 BASEBOT PROCESS 〕/);
});

test('plugin progress edits one informative status message through processing stages', async () => {
  const client = createClient();
  const progress = createPluginProgress({ client, message, plugin: { name: 'tiktok' }, command: 'tt' });
  await progress.start('Memvalidasi tautan', { detail: 'Memeriksa alamat tujuan.' });
  await progress.update('Mengunduh video', { detail: 'Mengambil file dari provider.' });
  await progress.complete('Video berhasil dikirim');
  const textMessages = client.calls.filter(call => typeof call.content.text === 'string');
  const edits = textMessages.filter(call => call.content.edit);
  assert.equal(textMessages.length, 3);
  assert.equal(edits.length, 2);
  assert.match(textMessages[0].content.text, /Plugin\s+: \*tiktok\*/);
  assert.match(edits[0].content.text, /Mengunduh video/);
  assert.match(edits[1].content.text, /BERHASIL/);
  assert.equal(progress.isFinished(), true);
  assert.equal(progress.snapshot().status, 'success');
});

test('plugin progress records a failure and sends a failure reaction', async () => {
  const client = createClient();
  const progress = createPluginProgress({ client, message, plugin: { name: 'play' }, command: 'play' });
  await progress.start('Mencari lagu');
  await progress.fail('Provider tidak tersedia', { detail: 'REF: A1B2C3D4' });
  const finalText = client.calls.filter(call => call.content.text).at(-1).content.text;
  assert.match(finalText, /GAGAL/);
  assert.match(finalText, /Provider tidak tersedia/);
  assert.ok(client.calls.some(call => call.content.react?.text === '❌'));
});

test('progress delivery failure never interrupts plugin execution', async () => {
  const client = createClient({ fail: true });
  const warnings = [];
  const progress = createPluginProgress({ client, message, plugin: { name: 'igdl' }, command: 'igdl', logger: { warn: (...args) => warnings.push(args) } });
  await assert.doesNotReject(progress.start('Memvalidasi tautan'));
  await assert.doesNotReject(progress.update('Mengunduh media'));
  assert.equal(progress.isStarted(), true);
  assert.equal(warnings.length, 1);
});

test('progress labels are sanitized and bounded', async () => {
  const client = createClient();
  const progress = createPluginProgress({ client, message, plugin: { name: 'test' }, command: 'test' });
  await progress.start('Tahap pertama\nBaris tambahan' + 'x'.repeat(200));
  const text = client.calls[0].content.text;
  assert.equal(text.includes('\nBaris tambahan'), false);
  assert.ok(text.length < 1000);
});
