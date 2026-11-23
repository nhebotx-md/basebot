'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createMenuService } = require('../../src/core/messaging/menu.service');

const feature = {
  name: 'sample-tool',
  category: 'tools',
  commands: ['sample', 'sample2'],
  description: 'Contoh fitur untuk pengujian.',
  usage: '.sample',
  permissions: {}
};

function fixture() {
  const menuPlugins = [
    { name: 'basebot-menu', category: 'main', commands: ['menu'] },
    { name: 'basebot-catmenu', category: 'main', commands: ['catmenu'] },
    { name: 'basebot-allmenu', category: 'main', commands: ['allmenu'] }
  ];
  const plugins = [...menuPlugins, feature];
  const registry = {
    list: () => plugins,
    getByCommand: command => plugins.find(plugin => plugin.commands.includes(command))
  };
  const service = createMenuService({
    registry,
    config: { botName: 'BASEBOT', prefix: '.', publicMode: true, timezone: 'Asia/Jakarta' },
    version: '2.0.0'
  });
  registry.menuService = service;
  const replies = [];
  const ctx = {
    command: 'allmenu', args: [], prefix: '.', pushname: 'Tester',
    isOwner: false, isGroupAdmin: false, isGroup: false, isPrivate: true,
    userRole: 'user', registry,
    reply: async value => replies.push(value)
  };
  return { registry, service, ctx, replies };
}

test('menu commands are routed to their plugin wrappers when registered', () => {
  const { service } = fixture();
  assert.equal(service.canHandle('menu'), false);
  assert.equal(service.canHandle('catmenu'), false);
  assert.equal(service.canHandle('allmenu'), false);
  assert.equal(service.canHandle('help'), true);
});

test('allmenu only renders accessible commands grouped by category', () => {
  const { service, ctx } = fixture();
  const output = service.renderAllMenu(ctx);
  assert.match(output, /TOOLS/);
  assert.match(output, /\.sample/);
  assert.match(output, /\.sample2/);
  assert.doesNotMatch(output, /BASEBOT · COMPLETE DIRECTORY|sample-tool|Contoh fitur|Pakai\s*:|COMMANDS|TOTAL|UPTIME|VERSI/);
  assert.doesNotMatch(output, /basebot-menu|basebot-catmenu|basebot-allmenu/);
});

test('menu command plugins delegate to the shared menu service', async () => {
  const { ctx, replies, service } = fixture();
  const menu = require('../../plugins/main/menu');
  const catmenu = require('../../plugins/main/catmenu');
  assert.equal(menu.commands[0], 'menu');
  assert.equal(catmenu.commands[0], 'catmenu');
  ctx.command = 'menu';
  await menu.execute(ctx);
  assert.equal(replies.length, 1);
  assert.match(replies[0], /FEATURE MENU|FEATURE COLLECTION/);
  ctx.command = 'catmenu';
  ctx.args = ['tools'];
  await catmenu.execute(ctx);
  assert.equal(replies.length, 2);
  assert.match(replies[1], /TOOLS DIRECTORY/);
});

test('allmenu plugin sends one compact category directory message', async () => {
  const { ctx, replies } = fixture();
  const allmenu = require('../../plugins/main/allmenu');
  await allmenu.execute(ctx);
  assert.equal(replies.length, 1);
  assert.match(replies[0], /TOOLS/);
  assert.match(replies[0], /\.sample/);
  assert.doesNotMatch(replies[0], /Contoh fitur|Pakai\s*:|TOTAL|UPTIME|VERSI/);
});

// WhatsApp read-more keeps the full directory in one message instead of spamming multiple replies.
test('allmenu inserts WhatsApp read-more marker when the directory is long', () => {
  const { service, ctx, registry } = fixture();
  const manyFeatures = Array.from({ length: 180 }, (_, index) => ({
    name: 'long-feature-' + index,
    category: index % 2 ? 'media' : 'tools',
    commands: ['longcommand' + index],
    permissions: {}
  }));
  registry.list = () => [
    { name: 'basebot-menu', category: 'main', commands: ['menu'] },
    { name: 'basebot-catmenu', category: 'main', commands: ['catmenu'] },
    { name: 'basebot-allmenu', category: 'main', commands: ['allmenu'] },
    ...manyFeatures
  ];
  const output = service.renderAllMenu(ctx);
  assert.ok(output.includes('\u200e'.repeat(4001)));
  assert.match(output, /\.longcommand179/);
});
