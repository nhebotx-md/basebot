'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createMenuService } = require('../../src/core/messaging/menu.service');

const commands = [
  'tobotak', 'tochibi', 'tofunk', 'tofigura', 'tofigurav2', 'tofigurav3',
  'toghibli', 'tohijab', 'tojapanese', 'tojepang', 'tokacamata', 'tokamboja'
];

function createFixture() {
  const plugins = [
    {
      name: 'ai-image-transform',
      category: 'maker',
      commands,
      description: 'Mengubah foto menjadi berbagai gaya visual.',
      usage: '.tochibi'
    },
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
  ctx.args = ['maker'];
  const output = service.renderCategory(ctx);

  assert.match(output, /ai-image-transform/);
  assert.match(output, /Mengubah foto menjadi berbagai gaya visual/);
  for (const command of commands) assert.ok(!output.includes('.' + command), 'unexpected command in compact directory: ' + command);
  assert.doesNotMatch(output, /Fungsi\s*:|Pakai\s*:|Command:/);
  assert.match(output, /Plugin\s+: 1/);
  assert.match(output, /Command\s+: 12/);
});

test('main menu shows plugin and command counts for new categories', () => {
  const { service, ctx } = createFixture();
  const output = service.renderMenu(ctx);

  assert.match(output, /catmenu maker/);
  assert.match(output, /1 plugin \/ 12 command/);
  assert.match(output, /catmenu sticker/);
  assert.match(output, /catmenu downloader/);
});

test('interactive category lists each plugin once without command explanations', async () => {
  const { service, ctx } = createFixture();
  const sent = [];
  const replies = [];
  ctx.command = 'catmenu';
  ctx.args = ['maker'];
  ctx.sendMessage = async (...args) => sent.push(args);
  ctx.reply = async message => replies.push(message);

  await service.execute(ctx);

  assert.equal(sent.length, 1);
  assert.equal(replies.length, 0);
  const rows = sent[0][1].buttons[0].sections[0].rows;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, 'ai-image-transform');
  assert.equal(rows[0].id, '.tobotak');
  assert.equal(rows[0].description, undefined);
});
