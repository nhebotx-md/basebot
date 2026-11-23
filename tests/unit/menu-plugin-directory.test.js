'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createMenuService } = require('../../src/core/messaging/menu.service');

const commands = [
  'tobotak', 'tochibi', 'tofunk', 'tofigura', 'tofigurav2', 'tofigurav3',
  'toghibli', 'tohijab', 'tojapanese', 'tojepang'
];

function createFixture() {
  const plugins = commands.map(command => ({
      name: 'image-' + command,
      category: 'image',
      commands: [command],
      description: 'Mengubah foto menjadi berbagai gaya visual.',
      usage: '.' + command
    }));
  const otherPlugins = [
    {
      name: 'brat-foto',
      category: 'sticker',
      commands: ['bratfoto'],
      description: 'Membuat sticker Brat dari foto.',
      usage: '.bratfoto'
    },
    {
      name: 'facebook-downloader',
      category: 'downloader',
      commands: ['fb'],
      description: 'Mengunduh video Facebook.',
      usage: '.fb <url>'
    }
  ];
  plugins.push(...otherPlugins);
  const registry = {
    list() { return plugins; },
    getByCommand(command) {
      return plugins.find(plugin => plugin.commands.includes(command)) || null;
    }
  };
  const database = {
    read() { return { menuPreferences: { menuTheme: 'showcase', categoryTheme: 'terminal' } }; }
  };
  const service = createMenuService({
    registry,
    config: { prefix: '.', timezone: 'Asia/Jakarta', botName: 'BASEBOT', publicMode: true },
    database
  });
  const ctx = {
    isOwner: true,
    isGroup: false,
    isPrivate: true,
    isGroupAdmin: false,
    isBotAdmin: false,
    isRegistered: true,
    userRole: 'user',
    userAccess: {},
    prefix: '.',
    pushname: 'Tester',
    chat: '6280000000000@s.whatsapp.net',
    args: []
  };
  return { service, ctx };
}

test('category directory shows plugin names without command aliases or descriptions', () => {
  const { service, ctx } = createFixture();
  ctx.args = ['image'];
  const output = service.renderCategory(ctx);

  assert.match(output, /image-tobotak/);
  assert.doesNotMatch(output, /Mengubah foto menjadi berbagai gaya visual/);
  for (const command of commands) assert.ok(!output.includes('.' + command), 'unexpected command in compact directory: ' + command);
  assert.doesNotMatch(output, /Fungsi\s*:|Pakai\s*:|Command:|COMMANDS?\s*:|<command>/i);
  assert.match(output, /PLUGIN\s*:\s*10/);
  assert.doesNotMatch(output, /COMMANDS?\s*:/i);
});

test('main menu shows plugin and command counts for new categories', () => {
  const { service, ctx } = createFixture();
  const output = service.renderMenu(ctx);

  assert.match(output, /catmenu image/);
  assert.match(output, /10 plugin \/ 10 command/);
  assert.match(output, /catmenu sticker/);
  assert.match(output, /catmenu downloader/);
});

test('category directory stays textual and lists each plugin once without command aliases', async () => {
  const { service, ctx } = createFixture();
  const replies = [];
  ctx.command = 'catmenu';
  ctx.args = ['image'];
  ctx.reply = async message => replies.push(message);

  await service.execute(ctx);

  assert.equal(replies.length, 1);
  assert.match(replies[0], /image-tobotak/);
  assert.doesNotMatch(replies[0], /\\.tobotak|Mengubah foto menjadi berbagai gaya visual|COMMANDS?\s*:/i);
});
