'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createMenuService, normalizeCategory, formatUptime, MENU_THEMES } = require('../../src/core/messaging/menu.service');
const { CommandDispatcher } = require('../../src/core/messaging/command-dispatcher');

const plugins = [
  { name: 'yt-download', category: 'download', commands: ['ytmp4', 'ytv'], description: 'Unduh video dari YouTube.', usage: '.ytmp4 <url>', permissions: {} },
  { name: 'owner-tools', category: 'owner', commands: ['setmode'], description: 'Mengubah mode bot.', usage: '.setmode public', permissions: {} },
  { name: 'ping', category: 'utility', commands: ['ping'], description: 'Memeriksa respons bot.', usage: '.ping', permissions: {} },
  { name: 'assistant', category: 'ai', commands: ['ask'], description: 'Asisten AI.', usage: '.ask pertanyaan', permissions: {} },
  { name: 'group-tools', category: 'group', commands: ['tagall'], description: 'Mengelola anggota grup.', usage: '.tagall', permissions: {} }
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

test('.menu keeps the manually selected theme and never rotates automatically', async () => {
  const { ctx, replies } = createContext();
  const service = createMenuService({ registry: createRegistry(), config, version: '2.0.0', startedAt: Date.now() - 60000 });
  for (let index = 0; index < 5; index += 1) await service.execute(ctx);
  assert.equal(replies.length, 5);
  assert.ok(replies.every(output => output.includes('COMMAND MENU')));
  assert.equal(new Set(replies).size, 1);
  assert.equal(service.getNextTheme(), 'showcase');
});


test('.setmenu and .setcatmenu are owner-only independent persistent settings', async () => {
  const state = { plugins: {} };
  const database = {
    read: () => structuredClone(state.plugins),
    update: async (_collection, updater) => { await updater(state.plugins); }
  };
  const service = createMenuService({ registry: createRegistry(), config, database, version: '2.0.0' });
  const denied = createContext({ command: 'setmenu', args: ['v2'] });
  await service.execute(denied.ctx);
  assert.match(denied.replies[0], /hanya dapat digunakan owner/);
  assert.equal(service.preferences.menuTheme, 'showcase');

  const ownerMain = createContext({ command: 'setmenu', args: ['v3'], isOwner: true });
  await service.execute(ownerMain.ctx);
  assert.match(ownerMain.replies[0], /V3/);
  assert.equal(service.preferences.menuTheme, 'minimal');
  assert.equal(state.plugins.menuPreferences.menuTheme, 'minimal');

  const ownerCategory = createContext({ command: 'setcatmenu', args: ['v5'], isOwner: true });
  await service.execute(ownerCategory.ctx);
  assert.equal(service.preferences.categoryTheme, 'editorial');
  assert.equal(state.plugins.menuPreferences.categoryTheme, 'editorial');
  assert.equal(service.preferences.menuTheme, 'minimal');

  const invalid = createContext({ command: 'setmenu', args: ['v9'], isOwner: true });
  await service.execute(invalid.ctx);
  assert.match(invalid.replies[0], /Versi tidak valid/);
});

test('menu theme preferences are restored from database on service recreation', () => {
  const database = { read: () => ({ menuPreferences: { menuTheme: 'terminal', categoryTheme: 'minimal' } }) };
  const service = createMenuService({ registry: createRegistry(), config, database });
  assert.equal(service.preferences.menuTheme, 'terminal');
  assert.equal(service.preferences.categoryTheme, 'minimal');
  assert.match(service.renderMenu(createContext().ctx), /COMMAND CENTER/);
  assert.match(service.renderCategory(createContext({ command: 'catmenu', args: ['download'] }).ctx), /DOWNLOAD DIRECTORY/);
});

test('.menu builds categories from active registry plugins and hides owner-only categories', async () => {
  const { ctx, replies } = createContext();
  const service = createMenuService({ registry: createRegistry(), config, version: '2.0.0', startedAt: Date.now() - 60000 });
  await service.execute(ctx);
  assert.equal(replies.length, 1);
  assert.match(replies[0], /ShoNhe/);
  assert.match(replies[0], /\.catmenu download/);
  assert.match(replies[0], /\.catmenu utility/);
  assert.match(replies[0], /\.catmenu ai/);
  assert.doesNotMatch(replies[0], /\.catmenu owner/);
  assert.doesNotMatch(replies[0], /\.catmenu group/);
  assert.match(replies[0], /Pengguna Uji/);

  const groupMember = createContext({ isGroup: true, isPrivate: false, isGroupAdmin: false });
  const memberMenu = createMenuService({ registry: createRegistry(), config, version: '2.0.0', startedAt: Date.now() - 60000 });
  const memberOutput = memberMenu.renderMenu(groupMember.ctx, 'showcase');
  assert.doesNotMatch(memberOutput, /\.catmenu group/);

  const groupAdmin = createContext({ isGroup: true, isPrivate: false, isGroupAdmin: true });
  const adminMenu = createMenuService({ registry: createRegistry(), config, version: '2.0.0', startedAt: Date.now() - 60000 });
  const adminOutput = adminMenu.renderMenu(groupAdmin.ctx, 'showcase');
  assert.match(adminOutput, /\.catmenu group/);
  assert.doesNotMatch(adminOutput, /\.catmenu owner/);
});

test('.catmenu renders a category-specific media layout with commands, aliases, and usage', async () => {
  const { ctx, replies } = createContext({ command: 'catmenu', args: ['download'] });
  const service = createMenuService({ registry: createRegistry(), config, version: '2.0.0' });
  await service.execute(ctx);
  assert.match(replies[0], /DOWNLOAD STUDIO/);
  assert.match(replies[0], /\.ytmp4/);
  assert.match(replies[0], /\.ytv/);
  assert.match(replies[0], /Unduh video dari YouTube/);
  assert.match(replies[0], /\.ytmp4 <url>/);
});

test('.catmenu selects distinct layouts for assistant, community, and utility categories', () => {
  const service = createMenuService({ registry: createRegistry(), config, version: '2.0.0' });
  const assistant = service.renderCategory(createContext({ command: 'catmenu', args: ['ai'] }).ctx);
  const community = service.renderCategory(createContext({ command: 'catmenu', args: ['group'], isGroup: true, isPrivate: false, isGroupAdmin: true }).ctx);
  const utility = service.renderCategory(createContext({ command: 'catmenu', args: ['utility'] }).ctx);
  assert.match(assistant, /AI DESK/);
  assert.match(community, /GROUP HUB/);
  assert.match(utility, /UTILITY DIRECTORY/);
});

test('.catmenu exposes owner-only plugins to the owner only', async () => {
  const registry = createRegistry();
  const service = createMenuService({ registry, config, version: '2.0.0' });
  const member = createContext({ command: 'catmenu', args: ['owner'] });
  await service.execute(member.ctx);
  assert.match(member.replies[0], /tidak ditemukan/);

  const owner = createContext({ command: 'catmenu', args: ['owner'], isOwner: true });
  await service.execute(owner.ctx);
  assert.match(owner.replies[0], /OWNER CONTROL CENTER/);
  assert.match(owner.replies[0], /\.setmode/);
});


test('.menu and .catmenu share a consistent framed information hierarchy', () => {
  const service = createMenuService({ registry: createRegistry(), config, version: '2.0.0', clock: () => new Date('2026-11-15T12:00:00Z') });
  const menu = service.renderMenu(createContext().ctx, 'premium');
  const category = service.renderCategory(createContext({ command: 'catmenu', args: ['download'] }).ctx);
  for (const output of [menu, category]) {
    assert.match(output, /^╭━━━━━━━━〔/);
    assert.match(output, /┣━━━━━━━━━━━━━━━━━━━━━━━━/);
    assert.match(output, /╰━━━━━━━━━━━━━━━━━━━━━━━━/);
  }
  assert.match(menu, /USER INFO/);
  assert.match(menu, /BOT INFO/);
  assert.match(menu, /FEATURE DIRECTORY/);
  assert.match(category, /DOWNLOAD STUDIO/);
  assert.match(category, /KATALOG FITUR/);
});

test('.catmenu category index and unknown category use the same premium frame language', () => {
  const service = createMenuService({ registry: createRegistry(), config, version: '2.0.0' });
  const index = service.renderCategory(createContext({ command: 'catmenu' }).ctx);
  const missing = service.renderCategory(createContext({ command: 'catmenu', args: ['not-real'] }).ctx);
  assert.match(index, /CATEGORY INDEX/);
  assert.match(index, /╭━━━━━━━━〔/);
  assert.match(missing, /CATEGORY NOT FOUND/);
  assert.match(missing, /╰━━━━━━━━━━━━━━━━━━━━━━━━/);
});

test('dispatcher handles built-in menu commands before plugin lookup', async () => {
  let executed = false;
  const dispatcher = new CommandDispatcher({
    registry: { getByCommand() { throw new Error('plugin lookup should not run for built-in menu'); } },
    menuService: {
      canHandle: command => command === 'menu',
      execute: async () => { executed = true; }
    },
    rateLimit: 0
  });
  const { ctx } = createContext({ command: 'menu', m: { id: 'menu-test-message' } });
  const result = await dispatcher.dispatch(ctx);
  assert.equal(executed, true);
  assert.equal(result.builtin, true);
});

test('.help uses the same core menu renderer as .menu', async () => {
  const { ctx, replies } = createContext({ command: 'help' });
  const service = createMenuService({ registry: createRegistry(), config, version: '2.0.0' });
  assert.equal(service.canHandle('help'), true);
  await service.execute(ctx);
  assert.match(replies[0], /COMMAND MENU/);
  assert.match(replies[0], /ShoNhe/);
});
