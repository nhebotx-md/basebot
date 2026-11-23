'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const idch = require('../../plugins/tools/idch');
const idgc = require('../../plugins/tools/idgc');
const cekidch = require('../../plugins/tools/cekidch');
const cekidgc = require('../../plugins/tools/cekidgc');
const { PluginRegistry } = require('../../src/core/plugins/plugin-registry');

function context(overrides = {}) {
  const replies = [];
  return {
    command: '', prefix: '.', text: '', chat: '120363000000000000@g.us',
    isGroup: false, isNewsletter: false, client: {},
    async reply(message) { replies.push(String(message)); },
    replies, ...overrides
  };
}

test('IDCH and IDGC register unique commands in tools category', () => {
  const registry = new PluginRegistry();
  registry.register(idch, 'tools/idch.js');
  registry.register(idgc, 'tools/idgc.js');
  registry.register(cekidch, 'tools/cekidch.js');
  registry.register(cekidgc, 'tools/cekidgc.js');
  assert.equal(registry.getByCommand('idch').name, 'tools-idch');
  assert.equal(registry.getByCommand('cekidch').name, 'tools-cekidch');
  assert.equal(registry.getByCommand('idgc').name, 'tools-idgc');
  assert.equal(registry.getByCommand('cekidgc').name, 'tools-cekidgc');
  assert.equal(registry.listByCategory('tools').length, 4);
});

test('IDCH parses invite URL, invite code, and newsletter JID', () => {
  assert.deepEqual(idch.parseChannelTarget('https://whatsapp.com/channel/0029Vb8vySGAYlUMLcZVFT3d'), { type: 'invite', value: '0029Vb8vySGAYlUMLcZVFT3d' });
  assert.deepEqual(idch.parseChannelTarget('0029Vb8vySGAYlUMLcZVFT3d'), { type: 'invite', value: '0029Vb8vySGAYlUMLcZVFT3d' });
  assert.deepEqual(idch.parseChannelTarget('123456789@newsletter'), { type: 'jid', value: '123456789@newsletter' });
  assert.equal(idch.parseChannelTarget('https://example.com/evil'), null);
});

test('IDCH fetches and displays detailed channel metadata', async () => {
  const calls = [];
  const ctx = context({
    command: 'idch', text: 'https://whatsapp.com/channel/0029Vb8vySGAYlUMLcZVFT3d',
    client: { async newsletterMetadata(...args) { calls.push(args); return { id: '120363111111111111@newsletter', name: 'BASEBOT Updates', description: 'Informasi rilis bot', subscribers: 1250, state: 'active', creation_time: 1735689600 }; } }
  });
  await idch.execute(ctx);
  assert.deepEqual(calls, [['invite', '0029Vb8vySGAYlUMLcZVFT3d']]);
  assert.match(ctx.replies[0], /BASEBOT Updates/);
  assert.match(ctx.replies[0], /120363111111111111@newsletter/);
  assert.match(ctx.replies[0], /1250/);
  assert.match(ctx.replies[0], /Informasi rilis bot/);
  assert.match(ctx.replies[0], /Kode Invite/);
});

test('IDCH uses metadata from the active Channel chat', async () => {
  const ctx = context({ isNewsletter: true, chat: '120363111111111111@newsletter', channelMetadata: { id: '120363111111111111@newsletter', name: 'Channel Aktif' } });
  await idch.execute(ctx);
  assert.match(ctx.replies[0], /Channel Aktif/);
});

test('IDCH handles invalid input and unavailable metadata API', async () => {
  const invalid = context({ text: 'bad' });
  await idch.execute(invalid);
  assert.match(invalid.replies[0], /Format tidak valid/);
  const unavailable = context({ text: '0029Vb8vySGAYlUMLcZVFT3d' });
  await idch.execute(unavailable);
  assert.match(unavailable.replies[0], /Gagal mengambil metadata Channel/);
});

test('IDGC parses invite URL, invite code, and group JID', () => {
  assert.deepEqual(idgc.parseGroupTarget('https://chat.whatsapp.com/AbCdEfGh12345678'), { type: 'invite', value: 'AbCdEfGh12345678' });
  assert.deepEqual(idgc.parseGroupTarget('AbCdEfGh12345678'), { type: 'invite', value: 'AbCdEfGh12345678' });
  assert.deepEqual(idgc.parseGroupTarget('120363000000000000@g.us'), { type: 'jid', value: '120363000000000000@g.us' });
  assert.equal(idgc.parseGroupTarget('https://example.com/evil'), null);
});

test('IDGC displays detailed metadata for the active group', async () => {
  const ctx = context({
    isGroup: true, chat: '120363000000000000@g.us',
    groupMetadata: { id: '120363000000000000@g.us', subject: 'Komunitas BASEBOT', desc: 'Diskusi dan pengumuman', participants: [{}, {}, {}], owner: '628123456789@s.whatsapp.net', creation: 1735689600, announce: true, restrict: false, memberAddMode: true, joinApprovalMode: true, ephemeralDuration: 86400, isCommunity: true }
  });
  await idgc.execute(ctx);
  assert.match(ctx.replies[0], /Komunitas BASEBOT/);
  assert.match(ctx.replies[0], /120363000000000000@g.us/);
  assert.match(ctx.replies[0], /Jumlah Anggota:\* 3/);
  assert.match(ctx.replies[0], /Hanya admin/);
  assert.match(ctx.replies[0], /24 jam/);
});

test('IDGC uses groupGetInviteInfo for invite links and groupMetadata for JIDs', async () => {
  const inviteCalls = [];
  const invite = context({ text: 'https://chat.whatsapp.com/AbCdEfGh12345678', client: { async groupGetInviteInfo(code) { inviteCalls.push(code); return { id: '120363000000000000@g.us', subject: 'Grup dari Invite', size: 42 }; } } });
  await idgc.execute(invite);
  assert.deepEqual(inviteCalls, ['AbCdEfGh12345678']);
  assert.match(invite.replies[0], /Grup dari Invite/);
  assert.match(invite.replies[0], /42/);

  const jidCalls = [];
  const jid = context({ text: '120363000000000000@g.us', client: { async groupMetadata(id) { jidCalls.push(id); return { id, subject: 'Grup dari JID', participants: [] }; } } });
  await idgc.execute(jid);
  assert.deepEqual(jidCalls, ['120363000000000000@g.us']);
  assert.match(jid.replies[0], /Grup dari JID/);
});

test('IDGC handles help, malformed targets, and unavailable metadata API', async () => {
  const help = context();
  await idgc.execute(help);
  assert.match(help.replies[0], /CEK ID GRUP/);
  const invalid = context({ text: 'bad' });
  await idgc.execute(invalid);
  assert.match(invalid.replies[0], /Format tidak valid/);
  const unavailable = context({ text: 'AbCdEfGh12345678' });
  await idgc.execute(unavailable);
  assert.match(unavailable.replies[0], /Gagal mengambil metadata grup/);
});
