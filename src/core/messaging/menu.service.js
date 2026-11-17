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
const MENU_THEMES = Object.freeze(['showcase', 'terminal', 'minimal', 'premium', 'editorial']);
const MENU_THEME_VERSIONS = Object.freeze({ v1: 'showcase', v2: 'terminal', v3: 'minimal', v4: 'premium', v5: 'editorial' });
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
  premium: { top: '╭━━━━━━━━〔', mid: '┣━━━━━━━━━━━━━━━━━━━━━━━━', bottom: '╰━━━━━━━━━━━━━━━━━━━━━━━━', bullet: '✦' },
  editorial: { top: '╭──────〔', mid: '├────────────────────────', bottom: '╰────────────────────────', bullet: '▸' }
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
function titleCase(value) {
  return String(value || '').toLocaleUpperCase('id-ID');
}
function categoryTitle(category) {
  const layout = CATEGORY_LAYOUTS[category.slug] || 'directory';
  const labels = {
    control: 'CONTROL CENTER', media: 'STUDIO', assistant: 'DESK',
    community: 'HUB', editorial: 'EDITORIAL', directory: 'DIRECTORY'
  };
  return titleCase(category.label) + ' ' + (labels[layout] || labels.directory);
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
  const heading = icon + ' ' + categoryTitle(category);
  const detail = plugins.map((plugin, index) => ({ plugin, index, command: prefix + (plugin.commands[0] || plugin.name) }));
  if (theme === 'terminal') {
    const lines = ['root@basebot:~$ catalog --category ' + category.slug, ''];
    lines.push('┌─ ' + heading, '│ ' + plugins.length + ' modules loaded | ' + commands + ' commands', '├─ COMMANDS');
    for (const { plugin, index, command } of detail) {
      lines.push('│ [' + String(index + 1).padStart(2, '0') + '] ' + command);
      if (plugin.commands.length > 1) lines.push('│     alias: ' + plugin.commands.slice(1).map(item => prefix + item).join(', '));
      if (plugin.description) lines.push('│     ' + cleanLabel(plugin.description, ''));
    }
    lines.push('└─ exit 0');
    return lines;
  }
  if (theme === 'minimal') {
    const lines = [heading, plugins.length + ' modules / ' + commands + ' commands', ''];
    for (const { plugin, command } of detail) {
      lines.push(command + (plugin.commands.length > 1 ? '  (' + plugin.commands.slice(1).map(item => prefix + item).join(', ') + ')' : ''));
      if (plugin.description) lines.push('  ' + cleanLabel(plugin.description, ''));
    }
    return lines;
  }
  if (theme === 'premium') {
    const lines = ['╔══════════ ✦ ' + heading + ' ✦ ══════════╗', '║  MODULES  ' + String(plugins.length).padEnd(4) + ' COMMANDS  ' + String(commands).padEnd(4) + '║', '╠══════════════════════════════════════════╣'];
    for (const { plugin, index, command } of detail) {
      lines.push('║  ' + String(index + 1).padStart(2, '0') + '  ✧  *' + command + '*');
      if (plugin.description) lines.push('║      ' + cleanLabel(plugin.description, ''));
      if (plugin.commands.length > 1) lines.push('║      Alias: ' + plugin.commands.slice(1).map(item => prefix + item).join(' · '));
      if (plugin.usage && plugin.usage !== command) lines.push('║      Usage: ' + cleanLabel(plugin.usage));
      lines.push('║');
    }
    lines.push('╚══════════════════════════════════════════╝');
    return lines;
  }
  if (theme === 'editorial') {
    const lines = ['THE BASEBOT FEATURE REVIEW', 'CATEGORY / ' + title, '────────────────────────────────', plugins.length + ' FEATURE STORIES  •  ' + commands + ' COMMANDS', ''];
    for (const { plugin, index, command } of detail) {
      lines.push(String(index + 1).padStart(2, '0') + '  /  ' + command);
      if (plugin.description) lines.push('     ' + cleanLabel(plugin.description, ''));
      if (plugin.commands.length > 1) lines.push('     ALSO: ' + plugin.commands.slice(1).map(item => prefix + item).join(' / '));
      if (plugin.usage && plugin.usage !== command) lines.push('     TRY: ' + cleanLabel(plugin.usage));
      lines.push('');
    }
    lines.push('────────────────────────────────', 'END OF CATEGORY / ' + category.slug);
    return lines;
  }
  const lines = frameLines(heading, 'showcase', 'KATALOG FITUR  •  ' + plugins.length + ' MODUL  •  ' + commands + ' COMMAND');
  for (const { plugin, index } of detail) lines.push(...pluginLines(plugin, prefix, index, 'showcase'), '│');
  if (!plugins.length) lines.push('│ Tidak ada fitur aktif pada kategori ini.');
  lines.push(FRAME.showcase.bottom);
  return lines;
}

function createMenuService({ registry, config, database = null, version = '0.0.0', startedAt = Date.now(), clock = () => new Date() }) {
  if (!registry || typeof registry.list !== 'function') throw new TypeError('MenuService membutuhkan PluginRegistry.');
  if (!config) throw new TypeError('MenuService membutuhkan konfigurasi.');
  const savedPreferences = database?.read?.('plugins')?.menuPreferences || {};
  const preferences = {
    menuTheme: MENU_THEMES.includes(savedPreferences.menuTheme) ? savedPreferences.menuTheme : 'showcase',
    categoryTheme: MENU_THEMES.includes(savedPreferences.categoryTheme) ? savedPreferences.categoryTheme : 'premium'
  };

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
  function getNextTheme() { return preferences.menuTheme; }

  async function setTheme(ctx, type) {
    const isCategory = type === 'category';
    const command = isCategory ? 'setcatmenu' : 'setmenu';
    const requested = String((ctx.args || [])[0] || '').trim().toLowerCase();
    if (!ctx.isOwner) return '╭━━━━━━━━〔 ACCESS DENIED 〕\n│ Command *.' + command + '* hanya dapat digunakan owner bot.\n╰━━━━━━━━━━━━━━━━━━━━━━━━';
    if (!requested) {
      const current = isCategory ? preferences.categoryTheme : preferences.menuTheme;
      const currentVersion = Object.keys(MENU_THEME_VERSIONS).find(key => MENU_THEME_VERSIONS[key] === current) || 'v1';
      return ['╭━━━━━━━━〔 MENU THEME SETTINGS 〕', '│ Pengaturan: *' + (isCategory ? 'CATEGORY MENU' : 'MAIN MENU') + '*', '│ Tema aktif: *' + currentVersion + '* (' + current + ')', '┣━━━━━━━━━━━━━━━━━━━━━━━━', ...Object.entries(MENU_THEME_VERSIONS).map(([v, theme]) => '│ ' + v + '  •  ' + theme), '╰━━━━━━━━━━━━━━━━━━━━━━━━', 'Gunakan *' + (ctx.prefix || '.') + command + ' v1-v5* untuk memilih tema.'].join('\n');
    }
    const selected = MENU_THEME_VERSIONS[requested];
    if (!selected) return 'Versi tidak valid. Pilihan tersedia: *v1, v2, v3, v4, v5*.\nContoh: *' + (ctx.prefix || '.') + command + ' v3*';
    const key = isCategory ? 'categoryTheme' : 'menuTheme';
    if (database?.update) await database.update('plugins', state => {
      state.menuPreferences = { ...(state.menuPreferences || {}), [key]: selected };
    });
    preferences[key] = selected;
    return '╭━━━━━━━━〔 THEME UPDATED 〕\n│ ' + (isCategory ? 'CATEGORY MENU' : 'MAIN MENU') + ' berhasil diubah.\n│ Versi: *' + requested.toUpperCase() + '*\n│ Tema: *' + selected + '*\n╰━━━━━━━━━━━━━━━━━━━━━━━━';
  }

  function renderMenu(ctx, selectedTheme = preferences.menuTheme) {
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
    const themeLabel = ({ showcase: 'COMMAND MENU', terminal: 'COMMAND CENTER', minimal: 'DIREKTORI FITUR', premium: 'FEATURE COLLECTION', editorial: 'THE FEATURE JOURNAL' })[theme];

    const categoryRows = categories.map((category, index) => ({
      category, index, icon: CATEGORY_ICONS[category.slug] || '▣',
      count: category.plugins.length,
      commands: category.plugins.reduce((sum, plugin) => sum + plugin.commands.length, 0)
    }));
    let lines;
    if (theme === 'terminal') {
      lines = ['┌─ BASEBOT SYSTEM CONSOLE ──────────────────', '| session: ' + userName + ' [' + role + ']', '| mode: ' + mode + ' | prefix: ' + prefixLabel, '| runtime: v' + cleanLabel(version) + ' / ' + uptime, '| modules: ' + plugins.length + ' / commands: ' + commandCount, '├─ DIRECTORY'];
      for (const row of categoryRows) lines.push('| [' + String(row.index + 1).padStart(2, '0') + '] ' + commandPrefix + 'catmenu ' + row.category.slug + '  (' + row.count + ' modules)');
      lines.push('└─ ' + parts.date + ' ' + parts.time + ' ' + timeZoneLabel(config.timezone), 'root@basebot:~$ _');
    } else if (theme === 'minimal') {
      lines = [botName + ' / ' + themeLabel, userName + ' · ' + role + ' · ' + mode, 'v' + cleanLabel(version) + ' | uptime ' + uptime, '', 'FEATURES'];
      for (const row of categoryRows) lines.push(row.icon + '  ' + commandPrefix + 'catmenu ' + row.category.slug + '  ·  ' + row.count + ' modules');
      lines.push('', commandCount + ' commands across ' + plugins.length + ' modules', parts.date + ' · ' + parts.time + ' ' + timeZoneLabel(config.timezone));
    } else if (theme === 'premium') {
      lines = ['╔══════════════ ✦ ' + botName + ' ✦ ══════════════╗', '║  COMMAND COLLECTION  /  v' + cleanLabel(version), '╠══════════════════════════════════════════════╣', '║  MEMBER   ' + userName + ' (' + role + ')', '║  STATUS   ' + mode + '  •  ' + uptime, '║  PREFIX   ' + prefixLabel, '║  OWNER    ' + ownerName, '╠══════════════ FEATURE COLLECTION ════════════╣'];
      for (const row of categoryRows) lines.push('║  ' + row.icon + '  *' + commandPrefix + 'catmenu ' + row.category.slug + '*  |  ' + row.count + ' modules / ' + row.commands + ' cmds');
      lines.push('╠══════════════════════════════════════════════╣', '║  TOTAL  ' + plugins.length + ' MODULES  •  ' + commandCount + ' COMMANDS', '╚══════════════════════════════════════════════╝', parts.date + '  •  ' + parts.time + ' ' + timeZoneLabel(config.timezone));
    } else if (theme === 'editorial') {
      lines = ['THE BASEBOT JOURNAL', 'VOL. 05  /  FEATURE DIRECTORY', '────────────────────────────────────────', botName + '  |  v' + cleanLabel(version), 'A modular WhatsApp automation workspace.', '', 'PROFILE', userName + ' / ' + role + ' / ' + mode, 'Runtime ' + uptime + ' · Prefix ' + prefixLabel, '', 'IN THIS EDITION'];
      for (const row of categoryRows) {
        lines.push(String(row.index + 1).padStart(2, '0') + '  ' + row.category.label.toUpperCase() + '  /  ' + row.count + ' modules');
        lines.push('     ' + commandPrefix + 'catmenu ' + row.category.slug + '  ·  ' + row.commands + ' commands');
      }
      lines.push('', '────────────────────────────────────────', 'INDEX: ' + plugins.length + ' modules / ' + commandCount + ' commands', 'OWNER: ' + ownerName, parts.date + ' · ' + parts.time + ' ' + timeZoneLabel(config.timezone));
    } else {
      lines = frameLines('✦ ' + botName + ' / ' + themeLabel, 'showcase', 'WHATSAPP AUTOMATION  •  MODULAR PLUGIN SYSTEM');
      lines.push('│ USER INFO', '│   NAME       : *' + userName + '*', '│   ROLE       : *' + role + '*', '│   MODE       : *' + mode + '*', '│   PREFIX     : *' + prefixLabel + '*', '│ BOT INFO', '│   VERSION    : *v' + cleanLabel(version) + '*', '│   UPTIME     : *' + uptime + '*', '│   MODULES    : *' + plugins.length + '*', '│   COMMANDS   : *' + commandCount + '*', '│   OWNER      : *' + ownerName + '*', FRAME.showcase.mid, '│ FEATURE DIRECTORY');
      if (!categoryRows.length) lines.push('│   Belum ada modul aktif yang dapat ditampilkan.');
      for (const row of categoryRows) lines.push('│   ' + row.icon + '  *' + commandPrefix + 'catmenu ' + row.category.slug + '*', '│      ' + row.count + ' modul  ·  ' + row.commands + ' command');
      lines.push(FRAME.showcase.bottom, ' ' + parts.date + '  •  ' + parts.time + ' ' + timeZoneLabel(config.timezone));
    }
    lines.push('Ketik *' + commandPrefix + 'catmenu <kategori>* untuk membuka katalog fitur.');
    return lines.join('\n');
  }

  function renderCategory(ctx) {
    const commandPrefix = typeof ctx.prefix === 'string' ? ctx.prefix : Array.isArray(config.prefix) ? (config.prefix[0] || '.') : String(config.prefix || '.');
    const requested = normalizeCategory((ctx.args || []).join(' '));
    const categories = getCategories(ctx);
    const theme = preferences.categoryTheme;
    if (!requested) {
      const rows = categories.map((category, index) => ({ category, index, icon: CATEGORY_ICONS[category.slug] || '▣' }));
      let lines;
      if (theme === 'terminal') {
        lines = ['root@basebot:~$ catalog --list', '┌─ AVAILABLE CATEGORIES'];
        for (const row of rows) lines.push('│ [' + String(row.index + 1).padStart(2, '0') + '] ' + commandPrefix + 'catmenu ' + row.category.slug);
        lines.push('└─ ' + rows.length + ' categories found');
      } else if (theme === 'minimal') {
        lines = ['CATEGORIES', rows.length + ' directories available', ''];
        for (const row of rows) lines.push(row.icon + '  ' + commandPrefix + 'catmenu ' + row.category.slug);
      } else if (theme === 'premium') {
        lines = ['╔════════════ ✦ CATEGORY COLLECTION ✦ ════════════╗', '║  SELECT A FEATURE SPACE                         ║', '╠═════════════════════════════════════════════════╣'];
        for (const row of rows) lines.push('║  ' + row.icon + '  *' + commandPrefix + 'catmenu ' + row.category.slug + '*  ·  ' + row.category.plugins.length + ' modules');
        lines.push('╚═════════════════════════════════════════════════╝');
      } else if (theme === 'editorial') {
        lines = ['THE CATEGORY INDEX', 'A FIELD GUIDE TO BASEBOT FEATURES', '────────────────────────────────────', 'CONTENTS'];
        for (const row of rows) lines.push(String(row.index + 1).padStart(2, '0') + ' / ' + row.category.label.toUpperCase() + '  ·  ' + commandPrefix + 'catmenu ' + row.category.slug);
        lines.push('────────────────────────────────────', rows.length + ' sections in this edition');
      } else {
        lines = frameLines('▣ CATEGORY INDEX', 'showcase', 'PILIH DIREKTORI FITUR YANG INGIN DIBUKA');
        for (const row of rows) lines.push('│ ' + row.icon + '  *' + commandPrefix + 'catmenu ' + row.category.slug + '*', '│      ' + row.category.plugins.length + ' modul tersedia');
        if (!rows.length) lines.push('│ Tidak ada kategori aktif.');
        lines.push(FRAME.showcase.bottom);
      }
      lines.push('Gunakan *' + commandPrefix + 'catmenu <kategori>* untuk membuka kategori.');
      return lines.join('\n');
    }
    const category = categories.find(item => item.slug === requested);
    if (!category) {
      const available = categories.map(item => item.slug).join(', ') || 'belum ada';
      return [
        '╭━━━━━━━━〔 ✕ CATEGORY NOT FOUND 〕━━━━━━━━',
        '│ Kategori *' + requested + '* tidak ditemukan atau tidak tersedia untuk akun ini.',
        '│ Kategori yang dapat diakses: ' + available,
        '╰━━━━━━━━━━━━━━━━━━━━━━━━',
        ' Ketik *' + commandPrefix + 'menu* untuk melihat direktori utama.'
      ].join('\n');
    }
    const lines = renderCategoryLayout(category, commandPrefix, theme);
    lines.push('Ketik *' + commandPrefix + 'menu* untuk kembali ke direktori utama.');
    return lines.join('\n').trim();
  }

  return Object.freeze({
    canHandle(command) { return ['menu', 'help', 'catmenu'].includes(command); },
    async execute(ctx) {
      let output;
      output = ctx.command === 'catmenu' ? renderCategory(ctx) : renderMenu(ctx);
      await ctx.reply(output);
      return { handled: true, command: ctx.command };
    },
    renderMenu, renderCategory, getCategories, getNextTheme, setTheme, themes: MENU_THEMES, themeVersions: MENU_THEME_VERSIONS, preferences
  });
}

module.exports = { createMenuService, normalizeCategory, formatUptime, MENU_THEMES, CATEGORY_LAYOUTS };
