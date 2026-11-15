'use strict';

const { validatePermission } = require('../security/permission-manager');

const CATEGORY_ICONS = Object.freeze({
  owner: '👑', main: '🏠', system: '🤖', utility: '🔧', tools: '🛠️',
  fun: '🎮', game: '🎯', download: '📥', downloader: '📥', search: '🔍',
  sticker: '🖼️', media: '🎬', ai: '🤖', group: '👥', religi: '☪️',
  islamic: '☪️', info: 'ℹ️', user: '📊', canvas: '🎨', random: '🎲',
  panel: '🖥️', vps: '☁️', anime: '🎌', finance: '💰', news: '📰',
  convert: '🔄', rpg: '⚔️', tts: '🗣️'
});
const MENU_THEMES = Object.freeze(['showcase', 'terminal', 'minimal', 'premium']);
const CATEGORY_LAYOUTS = Object.freeze({
  owner: 'control', system: 'control', panel: 'control', vps: 'control',
  download: 'media', downloader: 'media', media: 'media', sticker: 'media',
  ai: 'assistant', search: 'assistant', tts: 'assistant',
  group: 'community', user: 'community', fun: 'community', game: 'community',
  religi: 'editorial', islamic: 'editorial', news: 'editorial', anime: 'editorial'
});

function normalizeCategory(value) {
  return String(value || '').trim().toLocaleLowerCase('id-ID').replace(/\s+/g, '-');
}
function cleanLabel(value, fallback = '-') {
  const text = String(value || fallback).replace(/[\r\n\t]/g, ' ').replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return (text || fallback).slice(0, 64);
}
function formatUptime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return [days ? days + ' hari' : '', hours ? hours + 'j' : '', minutes ? minutes + 'm' : '', secs + 'dtk'].filter(Boolean).join(' ');
}
function timeZoneLabel(timeZone) {
  return ({ 'Asia/Jakarta': 'WIB', 'Asia/Makassar': 'WITA', 'Asia/Jayapura': 'WIT' })[timeZone] || timeZone || 'WIB';
}
function dateParts(timeZone, now = new Date()) {
  const options = { timeZone: timeZone || 'Asia/Jakarta' };
  try {
    return {
      time: new Intl.DateTimeFormat('id-ID', { ...options, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now),
      date: new Intl.DateTimeFormat('id-ID', { ...options, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now)
    };
  } catch {
    return { time: now.toISOString().slice(11, 16), date: now.toISOString().slice(0, 10) };
  }
}
function pluginCommandLines(plugin, prefix, index = 0) {
  const commands = plugin.commands || [];
  const primary = commands[0] || plugin.name;
  const lines = ['│ ' + String(index + 1).padStart(2, '0') + '. *' + prefix + primary + '*'];
  if (commands.length > 1) lines.push('│     Alias: ' + commands.slice(1).map(command => prefix + command).join(', '));
  if (plugin.description) lines.push('│     _' + cleanLabel(plugin.description, '') + '_');
  if (plugin.usage && plugin.usage !== prefix + primary) lines.push('│     Cara pakai: ' + cleanLabel(plugin.usage));
  return lines;
}

function renderCategoryLayout(category, prefix) {
  const icon = CATEGORY_ICONS[category.slug] || '📁';
  const title = category.label.toLocaleUpperCase('id-ID');
  const layout = CATEGORY_LAYOUTS[category.slug] || 'directory';
  const plugins = [...category.plugins].sort((a, b) => a.name.localeCompare(b.name, 'id'));
  const commands = plugins.reduce((total, plugin) => total + plugin.commands.length, 0);
  const lines = [];

  if (layout === 'control') {
    lines.push('╭━━━〔 ' + icon + ' *' + title + ' CONTROL CENTER* 〕━━━');
    lines.push('┃ *' + plugins.length + '* modul  •  *' + commands + '* command', '┣━━━━━━━━━━━━━━━━━━━━');
    for (const plugin of plugins) {
      const primary = plugin.commands[0] || plugin.name;
      lines.push('┃ ◈ *' + prefix + primary + '*');
      if (plugin.commands.length > 1) lines.push('┃   └ Alias: ' + plugin.commands.slice(1).map(command => prefix + command).join(', '));
      if (plugin.description) lines.push('┃   ' + cleanLabel(plugin.description, ''));
      if (plugin.usage && plugin.usage !== prefix + primary) lines.push('┃   Usage: ' + cleanLabel(plugin.usage));
    }
    lines.push('╰━━━━━━━━━━━━━━━━━━━━');
    return lines;
  }
  if (layout === 'media') {
    lines.push('╭─〔 ' + icon + ' *' + title + ' STUDIO* 〕', '│ Pusat fitur media dan pemrosesan konten', '│ ' + plugins.length + ' modul tersedia • ' + commands + ' command', '├────────────────────');
    for (const plugin of plugins) {
      const primary = plugin.commands[0] || plugin.name;
      lines.push('│ ▸ *' + prefix + primary + '*');
      if (plugin.description) lines.push('│   ' + cleanLabel(plugin.description, ''));
      if (plugin.commands.length > 1) lines.push('│   Alias: ' + plugin.commands.slice(1).map(command => prefix + command).join(', '));
      if (plugin.usage && plugin.usage !== prefix + primary) lines.push('│   Contoh: ' + cleanLabel(plugin.usage));
      lines.push('│');
    }
    lines.push('╰────────────────────');
    return lines;
  }
  if (layout === 'assistant') {
    lines.push('╭─〔 ' + icon + ' *' + title + ' DESK* 〕', '│ Asisten dan alat pencarian BASEBOT', '╰────────────────────');
    for (const plugin of plugins) {
      const primary = plugin.commands[0] || plugin.name;
      lines.push('', '✦ *' + prefix + primary + '*');
      if (plugin.description) lines.push('_' + cleanLabel(plugin.description, '') + '_');
      if (plugin.commands.length > 1) lines.push('Alias: ' + plugin.commands.slice(1).map(command => prefix + command).join(', '));
      if (plugin.usage && plugin.usage !== prefix + primary) lines.push('Cara pakai: ' + cleanLabel(plugin.usage));
    }
    return lines;
  }
  if (layout === 'community') {
    lines.push('╭─〔 ' + icon + ' *' + title + ' HUB* 〕', '│ Ruang fitur komunitas dan aktivitas pengguna', '├────────────────────');
    for (const plugin of plugins) {
      const primary = plugin.commands[0] || plugin.name;
      lines.push('│ ● *' + prefix + primary + '*');
      if (plugin.description) lines.push('│   ' + cleanLabel(plugin.description, ''));
      if (plugin.commands.length > 1) lines.push('│   ↳ ' + plugin.commands.slice(1).map(command => prefix + command).join(' • '));
    }
    lines.push('╰────────────────────');
    return lines;
  }
  if (layout === 'editorial') {
    lines.push('╭────────〔 ' + icon + ' *' + title + '* 〕', '│ KATALOG PILIHAN', '╰────────────────────');
    plugins.forEach((plugin, index) => {
      const primary = plugin.commands[0] || plugin.name;
      lines.push('', '*' + String(index + 1).padStart(2, '0') + ' / ' + prefix + primary + '*');
      if (plugin.description) lines.push(cleanLabel(plugin.description, ''));
      if (plugin.commands.length > 1) lines.push('Alias: ' + plugin.commands.slice(1).map(command => prefix + command).join(', '));
      if (plugin.usage && plugin.usage !== prefix + primary) lines.push('Contoh penggunaan: ' + cleanLabel(plugin.usage));
    });
    return lines;
  }
  lines.push('╭─〔 ' + icon + ' *' + title + ' DIRECTORY* 〕', '│ ' + plugins.length + ' plugin • ' + commands + ' command', '├────────────────────');
  plugins.forEach((plugin, index) => lines.push(...pluginCommandLines(plugin, prefix, index)));
  lines.push('╰────────────────────');
  return lines;
}

function createMenuService({ registry, config, version = '0.0.0', startedAt = Date.now(), clock = () => new Date() }) {
  if (!registry || typeof registry.list !== 'function') throw new TypeError('MenuService membutuhkan PluginRegistry.');
  if (!config) throw new TypeError('MenuService membutuhkan konfigurasi.');
  let themeCursor = 0;

  function getVisiblePlugins(ctx) {
    return registry.list({ includeDisabled: false }).filter(plugin => validatePermission(plugin, ctx).allowed);
  }
  function getCategories(ctx) {
    const groups = new Map();
    for (const plugin of getVisiblePlugins(ctx)) {
      const slug = normalizeCategory(plugin.category);
      if (!slug) continue;
      if (!groups.has(slug)) groups.set(slug, { slug, label: cleanLabel(plugin.category), plugins: [] });
      groups.get(slug).plugins.push(plugin);
    }
    return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label, 'id'));
  }
  function getNextTheme() {
    const theme = MENU_THEMES[themeCursor % MENU_THEMES.length];
    themeCursor = (themeCursor + 1) % MENU_THEMES.length;
    return theme;
  }
  function renderMenu(ctx, selectedTheme = getNextTheme()) {
    const theme = MENU_THEMES.includes(selectedTheme) ? selectedTheme : MENU_THEMES[0];
    const plugins = getVisiblePlugins(ctx);
    const categories = getCategories(ctx);
    const commandCount = plugins.reduce((total, plugin) => total + plugin.commands.length, 0);
    const now = clock();
    const parts = dateParts(config.timezone, now);
    const role = ctx.isOwner ? '👑 Owner' : ctx.isGroupAdmin ? '🛡️ Admin' : 'Member';
    const userName = cleanLabel(ctx.pushname, 'Pengguna');
    const botName = cleanLabel(config.botName, 'BASEBOT');
    const ownerName = cleanLabel(config.ownerName, 'Owner');
    const mode = config.publicMode ? 'PUBLIC' : 'SELF';
    const commandPrefix = Array.isArray(config.prefix) ? (config.prefix[0] || '.') : String(config.prefix || '.');
    const prefixLabel = Array.isArray(config.prefix) ? config.prefix.join(' / ') : commandPrefix;
    const lines = [];

    if (theme === 'terminal') {
      lines.push('┌─[ ' + botName.toUpperCase() + ' / COMMAND CENTER ]');
      lines.push('│ SESSION : ' + mode + '  |  ROLE : ' + role.replace(/[^\w ]/g, '').toUpperCase());
      lines.push('│ VERSION : v' + cleanLabel(version) + '  |  UPTIME : ' + formatUptime((now.getTime() - startedAt) / 1000));
      lines.push('│ MODULES : ' + plugins.length + '  |  COMMANDS : ' + commandCount);
      lines.push('├─[ DIRECTORY ]');
      if (!categories.length) lines.push('│ No active modules available.');
      for (const category of categories) lines.push('│ ' + (CATEGORY_ICONS[category.slug] || '•') + ' ' + commandPrefix + 'catmenu ' + category.slug + '  [' + category.plugins.length + ']');
      lines.push('└─[ ' + parts.time + ' ' + timeZoneLabel(config.timezone) + ' / ' + parts.date + ' ]');
      lines.push('> User: ' + userName + ' | Owner: ' + ownerName);
      return lines.join('\n');
    }
    if (theme === 'minimal') {
      lines.push('◇ *' + botName + '*  ·  v' + cleanLabel(version));
      lines.push('Halo, *' + userName + '*. Berikut direktori fitur yang tersedia.', '');
      lines.push(plugins.length + ' plugin  /  ' + commandCount + ' command  /  ' + mode);
      lines.push('Uptime ' + formatUptime((now.getTime() - startedAt) / 1000) + '  ·  ' + parts.time + ' ' + timeZoneLabel(config.timezone), '');
      for (const category of categories) lines.push((CATEGORY_ICONS[category.slug] || '•') + '  *' + commandPrefix + 'catmenu ' + category.slug + '*  _' + category.plugins.length + ' plugin_');
      if (!categories.length) lines.push('_Belum ada plugin aktif yang dapat ditampilkan._');
      lines.push('', 'Role: ' + role + '  ·  Owner: ' + ownerName);
      return lines.join('\n');
    }
    if (theme === 'premium') {
      lines.push('╭━━━━━━━━〔 ✦ *' + botName.toUpperCase() + '* 〕━━━━━━━━');
      lines.push('┃ *YOUR WHATSAPP ASSISTANT*', '┃ Versi ' + cleanLabel(version) + '  •  ' + mode + ' MODE', '┣━━━━━━━━━━━━━━━━━━━━━━');
      lines.push('┃ 👤 Pengguna : *' + userName + '*', '┃ 🎭 Akses    : *' + role + '*', '┃ ⚙️ Prefix  : *' + prefixLabel + '*');
      lines.push('┃ ⏱️ Uptime  : *' + formatUptime((now.getTime() - startedAt) / 1000) + '*', '┃ 🧩 Modul   : *' + plugins.length + '*', '┃ ⌘ Command : *' + commandCount + '*');
      lines.push('┣━━━━━━━━〔 FEATURE COLLECTION 〕');
      for (const category of categories) lines.push('┃ ' + (CATEGORY_ICONS[category.slug] || '📁') + '  *' + commandPrefix + 'catmenu ' + category.slug + '*  _' + category.plugins.length + ' modul_');
      if (!categories.length) lines.push('┃ Belum ada modul aktif.');
      lines.push('╰━━━━━━━━━━━━━━━━━━━━━━', ' ' + parts.date + '  •  ' + parts.time + ' ' + timeZoneLabel(config.timezone), ' Owner: ' + ownerName);
      return lines.join('\n');
    }

    lines.push('╭━━━〔 ◆ *' + botName + ' COMMAND MENU* 〕━━━');
    lines.push('┃ Halo, *' + userName + '*!', '┃ Bot WhatsApp modular untuk kebutuhanmu.', '┣━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('┃ 👤 Role      : *' + role + '*', '┃ ⚙️ Mode      : *' + mode + '*', '┃ 🔑 Versi     : *v' + cleanLabel(version) + '*');
    lines.push('┃ 🧶 Prefix    : *' + prefixLabel + '*', '┃ ⏱️ Uptime    : *' + formatUptime((now.getTime() - startedAt) / 1000) + '*');
    lines.push('┃ 🧩 Plugin    : *' + plugins.length + ' aktif*', '┃ 🛠️ Command   : *' + commandCount + '*', '┃ 👑 Owner     : *' + ownerName + '*');
    lines.push('┣━━━━━━━━〔 MENU CATEGORY 〕');
    for (const category of categories) lines.push('┃ ' + (CATEGORY_ICONS[category.slug] || '📁') + '  *' + commandPrefix + 'catmenu ' + category.slug + '*  ·  ' + category.plugins.length + ' plugin');
    if (!categories.length) lines.push('┃ Belum ada plugin aktif yang dapat ditampilkan.');
    lines.push('╰━━━━━━━━━━━━━━━━━━━━━━', ' ' + parts.time + ' ' + timeZoneLabel(config.timezone) + '  •  ' + parts.date);
    lines.push('Ketik *' + commandPrefix + 'profile* untuk melihat statistik akun.');
    return lines.join('\n');
  }

  function renderCategory(ctx) {
    const commandPrefix = typeof ctx.prefix === 'string' ? ctx.prefix : Array.isArray(config.prefix) ? (config.prefix[0] || '.') : String(config.prefix || '.');
    const requested = normalizeCategory((ctx.args || []).join(' '));
    const categories = getCategories(ctx);
    if (!requested) {
      return [
        '╭─〔 📂 *DAFTAR KATEGORI MENU* 〕',
        ...categories.map(category => '│ ' + (CATEGORY_ICONS[category.slug] || '📁') + ' *' + commandPrefix + 'catmenu ' + category.slug + '*  ·  ' + category.plugins.length + ' plugin'),
        '╰────────────────────', '',
        'Gunakan *' + commandPrefix + 'catmenu <kategori>* untuk membuka kategori.'
      ].join('\n');
    }
    const category = categories.find(item => item.slug === requested);
    if (!category) {
      const available = categories.map(item => item.slug).join(', ') || 'belum ada';
      return 'Kategori *' + requested + '* tidak ditemukan.\nKategori tersedia: ' + available + '\nKetik *' + commandPrefix + 'menu* untuk melihat daftar kategori.';
    }
    const lines = renderCategoryLayout(category, commandPrefix);
    lines.push('', 'Ketik *' + commandPrefix + 'menu* untuk kembali ke direktori utama.');
    return lines.join('\n').trim();
  }

  return Object.freeze({
    canHandle(command) { return command === 'menu' || command === 'help' || command === 'catmenu'; },
    async execute(ctx) {
      const output = ctx.command === 'catmenu' ? renderCategory(ctx) : renderMenu(ctx);
      await ctx.reply(output);
      return { handled: true, command: ctx.command };
    },
    renderMenu, renderCategory, getCategories, getNextTheme, themes: MENU_THEMES
  });
}

module.exports = { createMenuService, normalizeCategory, formatUptime, MENU_THEMES, CATEGORY_LAYOUTS };
