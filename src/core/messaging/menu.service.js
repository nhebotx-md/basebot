'use strict';

const { validatePermission } = require('../security/permission-manager');

const CATEGORY_ICONS = Object.freeze({
  owner: '👑', main: '⌂', system: '◈', utility: '⌘', tools: '⚙',
  fun: '✦', game: '◇', download: '⇩', downloader: '⇩', search: '⌕',
  sticker: '▧', media: '▣', ai: '✧', group: '◎', religi: '☾',
  islamic: '☾', info: 'ⓘ', user: '♙', canvas: '▤', random: '⁕',
  panel: '▦', vps: '⌁', anime: '✿', finance: '＄', news: '▤',
  convert: '⇄', rpg: '⚔', tts: '♫'
});
const MENU_THEMES = Object.freeze(['showcase', 'terminal', 'minimal', 'premium']);
const CATEGORY_LAYOUTS = Object.freeze({
  owner: 'control', system: 'control', panel: 'control', vps: 'control',
  download: 'media', downloader: 'media', media: 'media', sticker: 'media',
  ai: 'assistant', search: 'assistant', tts: 'assistant',
  group: 'community', user: 'community', fun: 'community', game: 'community',
  religi: 'editorial', islamic: 'editorial', news: 'editorial', anime: 'editorial'
});

const FRAME = Object.freeze({
  showcase: { top: '╭━━━━━━━━〔', mid: '┣━━━━━━━━━━━━━━━━━━━━━━━━', bottom: '╰━━━━━━━━━━━━━━━━━━━━━━━━', bullet: '◆' },
  terminal: { top: '┌─〔', mid: '├────────────────────────', bottom: '└────────────────────────', bullet: '›' },
  minimal: { top: '╭─〔', mid: '├────────────────────────', bottom: '╰────────────────────────', bullet: '·' },
  premium: { top: '╭━━━━━━━━〔', mid: '┣━━━━━━━━━━━━━━━━━━━━━━━━', bottom: '╰━━━━━━━━━━━━━━━━━━━━━━━━', bullet: '✦' }
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
function frameLines(title, theme = 'showcase', subtitle = '') {
  const frame = FRAME[theme] || FRAME.showcase;
  const lines = [frame.top + ' ' + title + ' 〕'];
  if (subtitle) lines.push('│ ' + subtitle);
  lines.push(frame.mid);
  return lines;
}
function categoryTitle(category) {
  const layout = CATEGORY_LAYOUTS[category.slug] || 'directory';
  const labels = {
    control: 'CONTROL CENTER', media: 'MEDIA STUDIO', assistant: 'AI DESK',
    community: 'COMMUNITY HUB', editorial: 'EDITORIAL', directory: 'COMMAND DIRECTORY'
  };
  return (labels[layout] || labels.directory);
}
function pluginLines(plugin, prefix, index, theme = 'showcase') {
  const bullet = (FRAME[theme] || FRAME.showcase).bullet;
  const commands = plugin.commands || [];
  const primary = commands[0] || plugin.name;
  const lines = ['│ ' + String(index + 1).padStart(2, '0') + '  ' + bullet + ' *' + prefix + primary + '*'];
  if (commands.length > 1) lines.push('│      ↳ Alias: ' + commands.slice(1).map(command => prefix + command).join('  ·  '));
  if (plugin.description) lines.push('│      ' + cleanLabel(plugin.description, ''));
  if (plugin.usage && plugin.usage !== prefix + primary) lines.push('│      Contoh: ' + cleanLabel(plugin.usage));
  return lines;
}
function renderCategoryLayout(category, prefix, theme = 'showcase') {
  const icon = CATEGORY_ICONS[category.slug] || '▣';
  const title = category.label.toLocaleUpperCase('id-ID');
  const plugins = [...category.plugins].sort((a, b) => a.name.localeCompare(b.name, 'id'));
  const commands = plugins.reduce((total, plugin) => total + plugin.commands.length, 0);
  const lines = frameLines(icon + ' ' + title + ' / ' + categoryTitle(category), theme,
    'KATALOG FITUR  •  ' + plugins.length + ' MODUL  •  ' + commands + ' COMMAND');
  plugins.forEach((plugin, index) => lines.push(...pluginLines(plugin, prefix, index, theme), '│'));
  if (!plugins.length) lines.push('│ Tidak ada fitur aktif pada kategori ini.');
  lines.push((FRAME[theme] || FRAME.showcase).bottom);
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
    const frame = FRAME[theme];
    const plugins = getVisiblePlugins(ctx);
    const categories = getCategories(ctx);
    const commandCount = plugins.reduce((total, plugin) => total + plugin.commands.length, 0);
    const now = clock();
    const parts = dateParts(config.timezone, now);
    const role = ctx.isOwner ? 'OWNER' : ctx.isGroupAdmin ? 'GROUP ADMIN' : ({ user: 'USER', premium: 'PREMIUM', moderator: 'MODERATOR', guest: 'GUEST' }[ctx.userRole] || 'MEMBER');
    const userName = cleanLabel(ctx.pushname, 'Pengguna');
    const botName = cleanLabel(config.botName, 'BASEBOT');
    const ownerName = cleanLabel(config.ownerName, 'Owner');
    const mode = config.publicMode ? 'PUBLIC' : 'SELF';
    const commandPrefix = Array.isArray(config.prefix) ? (config.prefix[0] || '.') : String(config.prefix || '.');
    const prefixLabel = Array.isArray(config.prefix) ? config.prefix.join(' / ') : commandPrefix;
    const uptime = formatUptime((now.getTime() - startedAt) / 1000);
    const themeLabel = ({ showcase: 'COMMAND MENU', terminal: 'COMMAND CENTER', minimal: 'direktori fitur', premium: 'FEATURE COLLECTION' })[theme];

    const lines = frameLines('✦ ' + botName.toUpperCase() + ' / ' + themeLabel, theme,
      'WHATSAPP AUTOMATION  •  MODULAR PLUGIN SYSTEM');
    lines.push('│ USER INFO');
    lines.push('│   NAME       : *' + userName + '*');
    lines.push('│   ROLE       : *' + role + '*');
    lines.push('│   MODE       : *' + mode + '*');
    lines.push('│   PREFIX     : *' + prefixLabel + '*');
    lines.push('│ BOT INFO');
    lines.push('│   VERSION    : *v' + cleanLabel(version) + '*');
    lines.push('│   UPTIME     : *' + uptime + '*');
    lines.push('│   MODULES    : *' + plugins.length + '*');
    lines.push('│   COMMANDS   : *' + commandCount + '*');
    lines.push('│   OWNER      : *' + ownerName + '*');
    lines.push(frame.mid, '│ FEATURE DIRECTORY');
    if (!categories.length) lines.push('│   Belum ada modul aktif yang dapat ditampilkan.');
    for (const category of categories) {
      const icon = CATEGORY_ICONS[category.slug] || '▣';
      lines.push('│   ' + icon + '  *' + commandPrefix + 'catmenu ' + category.slug + '*');
      lines.push('│      ' + category.plugins.length + ' modul  ·  ' + category.plugins.reduce((sum, item) => sum + item.commands.length, 0) + ' command');
    }
    lines.push(frame.bottom);
    lines.push(' ' + parts.date + '  •  ' + parts.time + ' ' + timeZoneLabel(config.timezone));
    lines.push(' Ketik *' + commandPrefix + 'catmenu <kategori>* untuk membuka katalog fitur.');
    return lines.join('\n');
  }

  function renderCategory(ctx) {
    const commandPrefix = typeof ctx.prefix === 'string' ? ctx.prefix : Array.isArray(config.prefix) ? (config.prefix[0] || '.') : String(config.prefix || '.');
    const requested = normalizeCategory((ctx.args || []).join(' '));
    const categories = getCategories(ctx);
    const theme = 'premium';
    if (!requested) {
      const lines = frameLines('▣ CATEGORY INDEX', theme, 'PILIH DIREKTORI FITUR YANG INGIN DIBUKA');
      for (const category of categories) {
        lines.push('│ ' + (CATEGORY_ICONS[category.slug] || '▣') + '  *' + commandPrefix + 'catmenu ' + category.slug + '*');
        lines.push('│      ' + category.plugins.length + ' modul tersedia');
      }
      if (!categories.length) lines.push('│ Tidak ada kategori aktif.');
      lines.push(FRAME[theme].bottom, ' Gunakan *' + commandPrefix + 'catmenu <kategori>* untuk membuka kategori.');
      return lines.join('\n');
    }
    const category = categories.find(item => item.slug === requested);
    if (!category) {
      const available = categories.map(item => item.slug).join(', ') || 'belum ada';
      return [
        '╭━━━━━━━━〔 ✕ CATEGORY NOT FOUND 〕━━━━━━━━',
        '│ Kategori *' + requested + '* tidak tersedia untuk akun ini.',
        '│ Kategori yang dapat diakses: ' + available,
        '╰━━━━━━━━━━━━━━━━━━━━━━━━',
        ' Ketik *' + commandPrefix + 'menu* untuk melihat direktori utama.'
      ].join('\n');
    }
    const lines = renderCategoryLayout(category, commandPrefix, theme);
    lines.push(' Ketik *' + commandPrefix + 'menu* untuk kembali ke direktori utama.');
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
