'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createMenuService, normalizeCategory, formatUptime } = require('../../src/core/messaging/menu.service');

const plugins = [
  { name: 'yt-download', category: 'download', commands: ['ytmp4', 'ytv'], description: 'Unduh video dari YouTube.', usage: '.ytmp4 <url>', permissions: {} },
  { name: 'owner-tools', category: 'owner', commands: ['setmode'], description: 'Mengubah mode bot.', usage: '.setmode public', permissions: { ownerOnly: true } },
  { name: 'ping', category: 'utility', commands: ['ping'], description: 'Memeriksa respons bot.', usage: '.ping', permissions: {} }
];

function createContext(overrides = {}) {
  const replies = [];
  return {
    ctx: {
      command: 'menu', args: [], prefix: '.', pushname: 'Pengguna Uji',
      isOwner: false, isGroupAdmin: false, isGroup: false, isPrivate: true,
      publicMode: true, sender: 'user@s.whatsapp.net', chat: 'user@s.whatsapp.net',
      reply: async value => replies.push(value),
      ...overrides
    },
    replies
  };
}

function createRegistry() {
  return {
    list: ({ includeDisabled } = {}) => includeDisabled ? plugins : plugins
  };
}

const config = { botName: 'ShoNhe', ownerName: 'Owner BASEBOT', prefix: '.', publicMode: true, timezone: 'Asia/Jakarta' };

test('normalizeCategory handles case and spaces', () => {
  assert.equal(normalizeCategory('AI Tools'), 'ai-tools');
});

test('formatUptime formats process uptime', () => {
  assert.equal(formatUptime(3661), '1j 1m 1dtk');
});

test('.menu builds categories from active registry plugins and hides owner-only categories', async () => {
  const { ctx, replies } = createContext();
  const service = createMenuService({ registry: createRegistry(), config, version: '2.0.0', startedAt: Date.now() - 60000 });
  await service.execute(ctx);
  assert.equal(replies.length, 1);
  assert.match(replies[0], /ShoNhe/);
  assert.match(replies[0], /\.catmenu download/);
  assert.match(replies[0], /\.catmenu utility/);
  assert.doesNotMatch(replies[0], /\.catmenu owner/);
  assert.match(replies[0], /Pengguna Uji/);
});

test('.catmenu renders commands, aliases, and usage for the requested category', async () => {
  const { ctx, replies } = createContext({ command: 'catmenu', args: ['download'] });
  const service = createMenuService({ registry: createRegistry(), config, version: '2.0.0' });
  await service.execute(ctx);
  assert.match(replies[0], /\.ytmp4/);
  assert.match(replies[0], /\.ytv/);
  assert.match(replies[0], /Unduh video dari YouTube/);
  assert.match(replies[0], /\.ytmp4 <url>/);
});

test('.catmenu exposes owner-only plugins to the owner only', async () => {
  const registry = createRegistry();
  const service = createMenuService({ registry, config, version: '2.0.0' });
  const member = createContext({ command: 'catmenu', args: ['owner'] });
  await service.execute(member.ctx);
  assert.match(member.replies[0], /tidak ditemukan/);

  const owner = createContext({ command: 'catmenu', args: ['owner'], isOwner: true });
  await service.execute(owner.ctx);
  assert.match(owner.replies[0], /\.setmode/);
});
