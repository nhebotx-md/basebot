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

test('allmenu renders every visible plugin with command, description and usage', () => {
  const { service, ctx } = fixture();
  const output = service.renderAllMenu(ctx);
  assert.match(output, /BASEBOT · COMPLETE DIRECTORY/);
  assert.match(output, /TOOLS DIRECTORY/);
  assert.match(output, /sample-tool/);
  assert.match(output, /\.sample/);
  assert.match(output, /Contoh fitur untuk pengujian/);
  assert.match(output, /Pakai\s*:/);
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

test('allmenu plugin sends the complete directory in WhatsApp-safe chunks', async () => {
  const { ctx, replies } = fixture();
  const allmenu = require('../../plugins/main/allmenu');
  await allmenu.execute(ctx);
  assert.ok(replies.length >= 1);
  assert.ok(replies.every(page => page.length <= 3500));
  assert.match(replies[0], /BASEBOT · COMPLETE DIRECTORY/);
});
