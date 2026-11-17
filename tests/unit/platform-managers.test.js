'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const groupAdmin = require('../../plugins/group/group-admin-manager');
const community = require('../../plugins/group/community-manager');
const newsletter = require('../../plugins/owner/newsletter-manager');
const richMessage = require('../../plugins/message/rich-message');

test('group admin manager restricts group creation to owner and invokes Baileys groupCreate', async () => {
  const replies = [];
  const calls = [];
  const ctx = {
    text: 'create Example Group',
    isOwner: true,
    m: { mentionedJid: ['628123456789@s.whatsapp.net'] },
    client: { async groupCreate(...args) { calls.push(args); return { id: '12345@g.us' }; } },
    async reply(value) { replies.push(value); }
  };
  await groupAdmin.execute(ctx);
  assert.deepEqual(calls, [['Example Group', ['628123456789@s.whatsapp.net']]]);
  assert.match(replies[0], /Grup berhasil dibuat/);
});

test('community manager creates a community through the dedicated API', async () => {
  const replies = [];
  const calls = [];
  const ctx = {
    text: 'create Dev Community | Weekly updates',
    client: { async communityCreate(...args) { calls.push(args); return { id: '12345@g.us' }; } },
    async reply(value) { replies.push(value); }
  };
  await community.execute(ctx);
  assert.deepEqual(calls, [['Dev Community', 'Weekly updates']]);
  assert.match(replies[0], /Community berhasil dibuat/);
});

test('newsletter manager resolves invite code before following a channel', async () => {
  const replies = [];
  const calls = [];
  const ctx = {
    text: 'follow https://whatsapp.com/channel/ABC123456789',
    client: {
      async newsletterMetadata(...args) { calls.push(['metadata', ...args]); return { id: '12345@newsletter' }; },
      async newsletterFollow(jid) { calls.push(['follow', jid]); }
    },
    async reply(value) { replies.push(value); }
  };
  await newsletter.execute(ctx);
  assert.deepEqual(calls, [
    ['metadata', 'invite', 'ABC123456789'],
    ['follow', '12345@newsletter']
  ]);
  assert.match(replies[0], /berhasil diproses/);
});

test('rich message plugin parses JSON and calls the shared rich message builder', async () => {
  const calls = [];
  const ctx = {
    text: 'code {"language":"javascript","code":"console.log(1)"}',
    chat: 'chat',
    services: { richMessage: { async sendCode(...args) { calls.push(args); } } },
    async reply() {}
  };
  await richMessage.execute(ctx);
  assert.deepEqual(calls, [['chat', { language: 'javascript', code: 'console.log(1)' }]]);
});
