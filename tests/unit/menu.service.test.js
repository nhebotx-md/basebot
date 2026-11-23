'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createMenuService, normalizeCategory, formatUptime, MENU_THEMES } = require('../../src/core/messaging/menu.service');
const { CommandDispatcher, commandSimilarity, findCommandSuggestions } = require('../../src/core/messaging/command-dispatcher');

const plugins = [
  { name: 'yt-download', category: 'download', commands: ['ytmp4', 'ytv'], description: 'Unduh video dari YouTube.', usage: '.ytmp4 <url>', permissions: {} },
  { name: 'owner-tools', category: 'owner', commands: ['setmode'], description: 'Mengubah mode bot.', usage: '.setmode public', permissions: {} },
  { name: 'ping', category: 'utility', commands: ['ping'], description: 'Memeriksa respons bot.', usage: '.ping', permissions: {} },
  { name: 'assistant', category: 'ai', commands: ['ask'], description: 'Asisten AI.', usage: '.ask pertanyaan', permissions: {} },
  { name: 'group-tools', category: 'group', commands: ['tagall'], description: 'Mengelola anggota grup.', usage: '.tagall', permissions: {} }
];

function createContext(overrides = {}) {
  const replies = [];
  const sends = [];
  return {
    ctx: {
      command: 'menu', args: [], prefix: '.', pushname: 'Pengguna Uji',
      isOwner: false, isGroupAdmin: false, isGroup: false, isPrivate: true,
      publicMode: true, sender: 'user@s.whatsapp.net', chat: 'user@s.whatsapp.net',
      reply: async value => replies.push(value),
      sendMessage: async (...args) => sends.push(args),
      ...overrides
    },
    replies,
    sends
  };
}

function createRegistry() {
  return {
    list: ({ includeDisabled } = {}) => includeDisabled ? plugins : plugins,
    getByCommand: command => plugins.find(plugin => plugin.commands.includes(String(command).toLowerCase()))
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
  const state = { plugins: {} };
  const database = {
    read: () => structuredClone(state.plugins),
    update: async (_collection, updater) => { await updater(state.plugins); }
  };
  const service = createMenuService({ registry: createRegistry(), config, database, version: '2.0.0' });
  const selected = createContext({ args: ['v4'], isOwner: true });
  assert.match(await service.setTheme(selected.ctx, 'menu'), /THEME UPDATED/);
  assert.equal(service.preferences.menuTheme, 'premium');
  assert.equal(state.plugins.menuPreferences.menuTheme, 'premium');

  const { ctx, replies } = createContext();
  for (let index = 0; index < 5; index += 1) await service.execute(ctx);
  assert.equal(replies.length, 5);
  assert.ok(replies.every(output => output.includes('THE FEATURE LOUNGE')));
  assert.ok(replies.every(output => output.includes('Pengguna Uji')));
  assert.equal(service.getNextTheme(), 'premium');
  assert.equal(service.preferences.menuTheme, 'premium');
});test('all five menu and category themes use distinct visual layouts', () => {
  const mainOutputs = MENU_THEMES.map(theme => {
    const service = createMenuService({ registry: createRegistry(), config, version: '2.0.0' });
    return service.renderMenu(createContext().ctx, theme);
  });
  assert.equal(new Set(mainOutputs).size, 5);

  const categoryOutputs = MENU_THEMES.map(theme => {
    const database = { read: () => ({ menuPreferences: { categoryTheme: theme } }) };
    const service = createMenuService({ registry: createRegistry(), config, database });
    return service.renderCategory(createContext({ command: 'catmenu', args: ['download'] }).ctx);
  });
  assert.equal(new Set(categoryOutputs).size, 5);

  const categoryIndexes = MENU_THEMES.map(theme => {
    const database = { read: () => ({ menuPreferences: { categoryTheme: theme } }) };
    const service = createMenuService({ registry: createRegistry(), config, database });
    return service.renderCategory(createContext({ command: 'catmenu' }).ctx);
  });
  assert.equal(new Set(categoryIndexes).size, 5);
});

test('menu theme settings are owner-only, independent, and persistent', async () => {
  const state = { plugins: {} };
  const database = {
    read: () => structuredClone(state.plugins),
    update: async (_collection, updater) => { await updater(state.plugins); }
  };
  const service = createMenuService({ registry: createRegistry(), config, database, version: '2.0.0' });
  const denied = createContext({ args: ['v2'] });
  assert.match(await service.setTheme(denied.ctx, 'menu'), /hanya dapat digunakan owner/);
  assert.equal(service.preferences.menuTheme, 'showcase');

  const ownerMain = createContext({ args: ['v3'], isOwner: true });
  assert.match(await service.setTheme(ownerMain.ctx, 'menu'), /V3/);
  assert.equal(service.preferences.menuTheme, 'minimal');
  assert.equal(state.plugins.menuPreferences.menuTheme, 'minimal');

  const ownerCategory = createContext({ args: ['v5'], isOwner: true });
  assert.match(await service.setTheme(ownerCategory.ctx, 'category'), /V5/);
  assert.equal(service.preferences.categoryTheme, 'editorial');
  assert.equal(state.plugins.menuPreferences.categoryTheme, 'editorial');
  assert.equal(service.preferences.menuTheme, 'minimal');

  const invalid = createContext({ args: ['v9'], isOwner: true });
  assert.match(await service.setTheme(invalid.ctx, 'menu'), /Versi tidak valid/);
});

test('setmenu and setcatmenu are standalone owner plugins routed through the registry', async () => {
  const registry = createRegistry();
  const service = createMenuService({ registry, config, version: '2.0.0' });
  registry.menuService = service;
  const setmenu = require('../../plugins/owner/setmenu');
  const setcatmenu = require('../../plugins/owner/setcatmenu');
  assert.equal(setmenu.commands[0], 'setmenu');
  assert.equal(setcatmenu.commands[0], 'setcatmenu');
  assert.equal(setmenu.permissions.ownerOnly, true);
  assert.equal(setcatmenu.permissions.ownerOnly, true);

  for (const [plugin, command, args, expected] of [
    [setmenu, 'setmenu', ['v2'], 'terminal'],
    [setcatmenu, 'setcatmenu', ['v4'], 'premium']
  ]) {
    const { ctx, replies } = createContext({ command, args, isOwner: true, registry });
    await plugin.execute(ctx);
    assert.equal(service.preferences[command === 'setmenu' ? 'menuTheme' : 'categoryTheme'], expected);
    assert.match(replies[0], /THEME UPDATED/);
  }
});

test('.menu v2 renders the terminal text layout without interactive messages', async () => {
  const database = { read: () => ({ menuPreferences: { menuTheme: 'terminal' } }) };
  const service = createMenuService({ registry: createRegistry(), config, database, version: '2.0.0' });
  const { ctx, replies, sends } = createContext({ command: 'menu' });
  await service.execute(ctx);
  assert.equal(replies.length, 1);
  assert.equal(sends.length, 0);
  assert.match(replies[0], /TERMINAL/);
  assert.match(replies[0], /\.catmenu download/);
});test('.menu v2 remains usable when no interactive-list transport is available', async () => {
  const database = { read: () => ({ menuPreferences: { menuTheme: 'terminal' } }) };
  const service = createMenuService({ registry: createRegistry(), config, database, version: '2.0.0' });
  const replies = [];
  const { ctx } = createContext({ command: 'menu', sendMessage: undefined, reply: async value => replies.push(value) });
  await service.execute(ctx);
  assert.equal(replies.length, 1);
  assert.match(replies[0], /TERMINAL/);
  assert.match(replies[0], /\.catmenu download/);
});test('.catmenu v2 renders terminal category and plugin directories as text', async () => {
  const database = { read: () => ({ menuPreferences: { categoryTheme: 'terminal' } }) };
  const service = createMenuService({ registry: createRegistry(), config, database, version: '2.0.0' });
  const index = createContext({ command: 'catmenu', args: [] });
  await service.execute(index.ctx);
  assert.equal(index.replies.length, 1);
  assert.equal(index.sends.length, 0);
  assert.match(index.replies[0], /CATEGORY CONSOLE/);
  const category = createContext({ command: 'catmenu', args: ['download'] });
  await service.execute(category.ctx);
  assert.equal(category.replies.length, 1);
  assert.equal(category.sends.length, 0);
  assert.match(category.replies[0], /AVAILABLE MODULES/);
  assert.match(category.replies[0], /yt-download/);
  assert.doesNotMatch(category.replies[0], /\.ytmp4|\.ytv/);
});test('.setmenu and .setcatmenu remain plain theme-setting commands', async () => {
  const registry = createRegistry();
  const service = createMenuService({ registry, config, version: '2.0.0' });
  registry.menuService = service;
  const setmenu = require('../../plugins/owner/setmenu');
  const setcatmenu = require('../../plugins/owner/setcatmenu');

  for (const [plugin, command, args, expected] of [
    [setmenu, 'setmenu', ['v2'], 'terminal'],
    [setcatmenu, 'setcatmenu', ['v2'], 'terminal']
  ]) {
    const { ctx, replies, sends } = createContext({ command, args, isOwner: true, registry });
    await plugin.execute(ctx);
    assert.equal(service.preferences[command === 'setmenu' ? 'menuTheme' : 'categoryTheme'], expected);
    assert.match(replies[0], /THEME UPDATED/);
    assert.equal(sends.length, 0);
  }
});

test('menu theme preferences are restored from database on service recreation', () => {
  const database = { read: () => ({ menuPreferences: { menuTheme: 'terminal', categoryTheme: 'minimal' } }) };
  const service = createMenuService({ registry: createRegistry(), config, database });
  assert.equal(service.preferences.menuTheme, 'terminal');
  assert.equal(service.preferences.categoryTheme, 'minimal');
  assert.match(service.renderMenu(createContext().ctx), /TERMINAL/);
  assert.match(service.renderCategory(createContext({ command: 'catmenu', args: ['download'] }).ctx), /DOWNLOAD STUDIO/);
});

test('.menu builds categories from active registry plugins and hides owner-only categories', async () => {
  const { ctx, replies } = createContext();
  const service = createMenuService({ registry: createRegistry(), config, version: '2.0.0', startedAt: Date.now() - 60000 });
  await service.execute(ctx);
  assert.equal(replies.length, 1);
  assert.match(replies[0], /ShoNhe/);
  assert.doesNotMatch(replies[0], /modules|modul|commands|command:/i);
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

test('.catmenu <category> is a compact plugin directory without command or help text', async () => {
  const { ctx, replies } = createContext({ command: 'catmenu', args: ['download'] });
  const service = createMenuService({ registry: createRegistry(), config, version: '2.0.0' });
  await service.execute(ctx);
  assert.match(replies[0], /DOWNLOAD STUDIO/);
  assert.match(replies[0], /yt-download/);
  assert.doesNotMatch(replies[0], /Command:|Fungsi\s*:|Pakai\s*:/);
  assert.doesNotMatch(replies[0], /Unduh video dari YouTube|\.ytmp4|\.ytv/);
  assert.match(replies[0], /PLUGINS\s+1/);
  assert.match(replies[0], /COMMANDS\s+2/);
});

test('.group opens the detailed guide for every plugin in the selected category', async () => {
  const registry = createRegistry();
  const service = createMenuService({ registry, config, version: '2.0.0' });
  const { ctx, replies } = createContext({ command: 'group', isGroup: true, isPrivate: false, isGroupAdmin: true });
  assert.equal(service.canHandle('group'), true);
  await service.execute(ctx);
  assert.match(replies[0], /GROUP HUB/);
  assert.match(replies[0], /Command:/);
  assert.match(replies[0], /Fungsi\s*:/);
  assert.match(replies[0], /Pakai\s*:/);
  assert.match(replies[0], /\.tagall/);
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
  assert.doesNotMatch(owner.replies[0], /\.setmode/);

  const ownerGuide = createContext({ command: 'owner', isOwner: true });
  await service.execute(ownerGuide.ctx);
  assert.match(ownerGuide.replies[0], /\.setmode/);
  assert.match(ownerGuide.replies[0], /Mengubah mode bot/);
});


test('.menu and .catmenu share a consistent framed information hierarchy', () => {
  const service = createMenuService({ registry: createRegistry(), config, version: '2.0.0', clock: () => new Date('2026-11-15T12:00:00Z') });
  const menu = service.renderMenu(createContext().ctx, 'premium');
  const category = service.renderCategory(createContext({ command: 'catmenu', args: ['download'] }).ctx);
  for (const output of [menu, category]) {
    assert.match(output, /^╔/);
    assert.match(output, /╠═+/);
    assert.match(output, /╚═+/);
  }
  assert.match(menu, /MEMBER/);
  assert.match(menu, /SYSTEM STATUS/);
  assert.match(menu, /FEATURE COLLECTION/);
  assert.match(category, /DOWNLOAD STUDIO/);
  assert.doesNotMatch(category, /Unduh video dari YouTube|\.ytv|Command:|Fungsi\s*:|Pakai\s*:/);
});

test('.catmenu category index and unknown category use the same premium frame language', () => {
  const service = createMenuService({ registry: createRegistry(), config, version: '2.0.0' });
  const index = service.renderCategory(createContext({ command: 'catmenu' }).ctx);
  const missing = service.renderCategory(createContext({ command: 'catmenu', args: ['not-real'] }).ctx);
  assert.match(index, /CATEGORY COLLECTION/);
  assert.doesNotMatch(index, /modules|modul tersedia|commands/i);
  assert.match(index, /╔════════════ ✦ CATEGORY COLLECTION/);
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
  assert.match(replies[0], /FEATURE MENU/);
  assert.match(replies[0], /ShoNhe/);
});


test('.help <command> shows plugin guidance only when requested', async () => {
  const { ctx, replies } = createContext({ command: 'help', args: ['ytmp4'] });
  const service = createMenuService({ registry: createRegistry(), config });
  await service.execute(ctx);
  assert.match(replies[0], /FEATURE GUIDE/);
  assert.match(replies[0], /\.ytmp4/);
  assert.match(replies[0], /\.ytv/);
  assert.match(replies[0], /Unduh video dari YouTube/);
  assert.match(replies[0], /\.ytmp4 <url>/);
});

test('command similarity ranks typo corrections and respects user permissions', () => {
  assert.ok(commandSimilarity('stiker', 'sticker') > 0.7);
  const suggestions = findCommandSuggestions('ytmpp4', createRegistry(), createContext().ctx);
  assert.ok(suggestions.some(item => item.command === 'ytmp4'));
  const hidden = findCommandSuggestions('setmod', createRegistry(), createContext().ctx);
  assert.equal(hidden.some(item => item.command === 'setmode'), false);
});

test('.menu and .catmenu keep directory views concise while .help exposes plugin details', () => {
  const service = createMenuService({ registry: createRegistry(), config });
  const menu = service.renderMenu(createContext().ctx, 'terminal');
  const category = service.renderCategory(createContext({ command: 'catmenu', args: ['download'] }).ctx);
  assert.doesNotMatch(menu, /root@basebot|catalog --|exit 0|modules loaded/i);
  assert.doesNotMatch(menu, /Unduh video dari YouTube|\\.ytv|<url>/);
  assert.doesNotMatch(category, /Unduh video dari YouTube|\.ytv|\.ytmp4 <url>/);
  const help = service.renderPluginHelp(createContext().ctx, 'ytmp4');
  assert.match(help, /Unduh video dari YouTube/);
  assert.match(help, /\.ytv/);
  assert.match(help, /\.ytmp4 <url>/);
});

test('.catmenu <category> <command> opens contextual plugin guidance', async () => {
  const { ctx, replies } = createContext({ command: 'catmenu', args: ['download', 'ytmp4'] });
  const service = createMenuService({ registry: createRegistry(), config });
  await service.execute(ctx);
  assert.match(replies[0], /FEATURE GUIDE/);
  assert.match(replies[0], /\.ytmp4/);
  assert.match(replies[0], /\.ytv/);
  assert.match(replies[0], /Unduh video dari YouTube/);
});


test('dispatcher replies with a permission-safe typo correction', async () => {
  const { ctx, replies } = createContext({ command: 'ytmpp4', args: [], m: { id: 'typo-test' } });
  const dispatcher = new CommandDispatcher({ registry: createRegistry(), rateLimit: 0 });
  const result = await dispatcher.dispatch(ctx);
  assert.equal(result.reason, 'unknown-command');
  assert.ok(result.suggestions.includes('ytmp4'));
  assert.match(replies[0], /Mungkin maksudmu/);
  assert.match(replies[0], /\.ytmp4/);
});

test('all five themes expose the same live system information and registered command count', () => {
  const service = createMenuService({
    registry: createRegistry(),
    config,
    version: '2.0.0',
    startedAt: Date.now() - 3661_000,
    clock: () => new Date('2026-11-18T02:57:53.000Z')
  });
  for (const theme of MENU_THEMES) {
    const output = service.renderMenu(createContext().ctx, theme);
    assert.match(output, /Pengguna Uji/);
    assert.match(output, /PUBLIC/);
    assert.match(output, /WIB\s*:/);
    assert.match(output, /WITA\s*:/);
    assert.match(output, /WIT\s*:/);
    assert.match(output, /Tanggal\s*:/);
    assert.match(output, /Uptime\s*:/);
    assert.match(output, /OS\s*:/);
    assert.match(output, /RAM\s*:/);
    assert.match(output, /Fitur\s*:\s*4 Command/);
    assert.match(output, /\.catmenu download/);
  }
});

