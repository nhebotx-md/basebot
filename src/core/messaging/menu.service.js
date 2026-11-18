'use strict';

const os = require('node:os');
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
  const primary = (plugin.commands || [])[0] || plugin.name;
  return ['│ ' + String(index + 1).padStart(2, '0') + '  ' + bullet + ' *' + prefix + primary + '*'];
}

function renderCategoryLayout(category, prefix, theme = 'showcase') {
  const icon = CATEGORY_ICONS[category.slug] || '▣';
  const heading = icon + ' ' + categoryTitle(category);
  const plugins = [...category.plugins].sort((a, b) => a.name.localeCompare(b.name, 'id'));
  const entries = plugins.map((plugin, index) => ({
    plugin,
    index,
    command: prefix + ((plugin.commands || [])[0] || plugin.name)
  }));
  const commands = entries.map(({ command }, index) => {
    const number = String(index + 1).padStart(2, '0');
    if (theme === 'terminal') return '│ ◃ ' + command;
    if (theme === 'minimal') return command;
    if (theme === 'premium') return '║  ' + number + '  ◇  *' + command + '*';
    if (theme === 'editorial') return number + '  /  ' + command;
    return '│ ◈ ' + command;
  });
  if (theme === 'terminal') return [
    '┌─ [ ' + heading + ' ]',
    '│ ◈ Kategori : ' + cleanLabel(category.label),
    '│ ◈ Fitur    : ' + entries.length + ' command',
    '├─ [ FEATURE DIRECTORY ]',
    ...(commands.length ? commands : ['│ ◈ Belum ada fitur aktif.']),
    '└─ END OF CATEGORY'
  ];
  if (theme === 'minimal') return [
    heading.toUpperCase(),
    'FEATURES / ' + entries.length,
    '────────────────────────',
    ...(commands.length ? commands : ['Belum ada fitur aktif.']),
    '────────────────────────'
  ];
  if (theme === 'premium') return [
    '╔══════════════ ' + heading + ' ══════════════╗',
    '║  CATEGORY PROFILE',
    '║  NAME      ' + cleanLabel(category.label),
    '║  FEATURES  ' + entries.length,
    '╠══════════════ FEATURE DIRECTORY ════════════╣',
    ...(commands.length ? commands : ['║  Belum ada fitur aktif.']),
    '╚═════════════════════════════════════════════╝'
  ];
  if (theme === 'editorial') return [
    'BASEBOT / FEATURE INDEX',
    'CATEGORY ' + titleCase(category.label),
    '────────────────────────────────',
    'DIRECTORY  ·  ' + entries.length + ' ENTRIES',
    ...(commands.length ? commands : ['Belum ada fitur aktif.']),
    '────────────────────────────────'
  ];
  return [
    '┌─ [ ' + heading + ' ]',
    '│ ◈ Kategori : ' + cleanLabel(category.label),
    '│ ◈ Total    : ' + entries.length + ' fitur',
    '├─ [ FEATURE DIRECTORY ]',
    ...(commands.length ? commands : ['│ ◈ Belum ada fitur aktif.']),
    '└──────────────────────────────'
  ];
}

function formatMemory(bytes) {
  const value = Math.max(0, Number(bytes) || 0) / (1024 ** 3);
  return value.toFixed(2) + ' GB';
}

function clockAt(timeZone, now) {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    }).format(now);
  } catch {
    return '--:--:--';
  }
}

function countCommands(categories) {
  return categories.reduce((total, category) => total + category.plugins.reduce((count, plugin) => count + Math.max(1, (plugin.commands || []).length), 0), 0);
}

function getSystemInfo(now, timeZone, uptime, featureCount) {
  const totalMemory = os.totalmem();
  const usedMemory = Math.max(0, totalMemory - os.freemem());
  const date = dateParts(timeZone || 'Asia/Jakarta', now).date;
  const platform = process.env.ANDROID_ROOT ? 'android' : process.platform;
  return {
    wib: clockAt('Asia/Jakarta', now),
    wita: clockAt('Asia/Makassar', now),
    wit: clockAt('Asia/Jayapura', now),
    date,
    uptime,
    os: platform,
    ram: formatMemory(usedMemory) + ' / ' + formatMemory(totalMemory),
    featureCount
  };
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
    const categories = getCategories(ctx);
    const now = clock();
    const role = ctx.isOwner ? 'OWNER' : ctx.isGroupAdmin ? 'GROUP ADMIN' : ({ user: 'USER', premium: 'PREMIUM', moderator: 'MODERATOR', guest: 'GUEST' }[ctx.userRole] || 'MEMBER');
    const userName = cleanLabel(ctx.pushname, 'Pengguna');
    const botName = cleanLabel(config.botName, 'BASEBOT');
    const mode = config.publicMode ? 'PUBLIC' : 'SELF';
    const commandPrefix = Array.isArray(config.prefix) ? (config.prefix[0] || '.') : String(config.prefix || '.');
    const prefixLabel = Array.isArray(config.prefix) ? config.prefix.join(' / ') : commandPrefix;
    const uptime = formatUptime((now.getTime() - startedAt) / 1000);
    const featureCount = countCommands(categories);
    const system = getSystemInfo(now, config.timezone, uptime, featureCount);
    const rows = categories.map((category, index) => ({
      category,
      index,
      icon: CATEGORY_ICONS[category.slug] || '▣'
    }));
    const directory = rows.map(row => {
      const command = commandPrefix + 'catmenu ' + row.category.slug;
      if (theme === 'terminal') return '│ ◃ ' + command;
      if (theme === 'minimal') return command;
      if (theme === 'premium') return '║  ' + row.icon + '  *' + command + '*';
      if (theme === 'editorial') return String(row.index + 1).padStart(2, '0') + '  /  ' + row.category.label.toUpperCase() + '  ·  ' + command;
      return '│ ◈ ' + row.icon + '  *' + command + '*';
    });
    const info = [
      '│ ◈ WIB    : ' + system.wib,
      '│ ◈ WITA   : ' + system.wita,
      '│ ◈ WIT    : ' + system.wit,
      '│ ◈ Tanggal: ' + system.date,
      '│ ◈ Uptime : ' + system.uptime,
      '│ ◈ OS     : ' + system.os,
      '│ ◈ RAM    : ' + system.ram,
      '│ ◈ Fitur  : ' + system.featureCount + ' Command'
    ];
    let lines;
    if (theme === 'terminal') {
      lines = [
        '┌─ [ 👤 USER INFO ]',
        '│ ◈ Nama   : ' + userName,
        '│ ◈ Status : ' + role,
        '│ ◈ Mode   : ' + mode,
        '└──────────────',
        '',
        '┌─ [ SYSTEM INFO ]',
        ...info,
        '└──────────────',
        '',
        'BASEBOT SYSTEM DASHBOARD',
        '【 ⚙ MAIN MENU 】',
        ...directory,
        '└─ END OF DIRECTORY'
      ];
    } else if (theme === 'minimal') {
      lines = [
        botName.toUpperCase() + ' / MENU',
        userName + ' · ' + role + ' · ' + mode,
        'v' + cleanLabel(version) + '  |  ' + prefixLabel,
        '────────────────────────',
        'SYSTEM',
        ...info.map(line => line.replace(/^│ ◈ /, '  ')),
        '',
        'FEATURE DIRECTORY',
        ...directory,
        '────────────────────────',
        'Gunakan ' + commandPrefix + 'catmenu <kategori> untuk membuka fitur.'
      ];
    } else if (theme === 'premium') {
      lines = [
        '╔══════════════ ' + botName + ' ══════════════╗',
        '║  FEATURE COLLECTION',
        '║  MEMBER   ' + userName + ' (' + role + ')',
        '║  STATUS   ' + mode + '  ·  ' + uptime,
        '║  VERSION  v' + cleanLabel(version) + '  ·  PREFIX ' + prefixLabel,
        '╠══════════════ SYSTEM MONITOR ══════════════╣',
        ...info.map(line => '║ ' + line.replace(/^│ /, '')),
        '╠══════════════ FEATURE DIRECTORY ══════════╣',
        ...directory,
        '╚════════════════════════════════════════════╝'
      ];
    } else if (theme === 'editorial') {
      lines = [
        botName.toUpperCase() + ' / SYSTEM DIRECTORY',
        'A structured index of available features',
        '────────────────────────────────────────',
        'USER      / ' + userName,
        'ROLE      / ' + role,
        'MODE      / ' + mode,
        'RELEASE   / v' + cleanLabel(version),
        'PREFIX    / ' + prefixLabel,
        '',
        'SYSTEM REPORT',
        ...info.map(line => line.replace(/^│ ◈ /, '  ')),
        '',
        'CONTENTS',
        ...directory,
        '────────────────────────────────────────',
        'Pilih kategori dengan ' + commandPrefix + 'catmenu <kategori>'
      ];
    } else {
      lines = [
        '┌─ [ ' + botName.toUpperCase() + ' / FEATURE MENU ]',
        '│ USER INFORMATION',
        '│ ◈ Nama   : ' + userName,
        '│ ◈ Status : ' + role,
        '│ ◈ Mode   : ' + mode,
        '│ ◈ Versi  : v' + cleanLabel(version),
        '│ ◈ Prefix : ' + prefixLabel,
        '├─ [ SYSTEM MONITOR ]',
        ...info,
        '├─ [ FEATURE DIRECTORY ]',
        ...directory,
        '└──────────────────────────────'
      ];
    }
    return lines.join('\n');
  }

  function renderPluginHelp(ctx, command) {
    const requested = String(command || '').trim().toLocaleLowerCase('id-ID');
    const plugin = registry.getByCommand?.(requested);
    if (!plugin || !validatePermission(plugin, ctx).allowed) return null;
    const prefix = ctx.prefix || (Array.isArray(config.prefix) ? config.prefix[0] : config.prefix) || '.';
    const commands = (plugin.commands || []).map(item => prefix + item);
    return [
      '╭━━━━━━━━〔 FEATURE GUIDE 〕',
      '│ FEATURE : *' + cleanLabel(plugin.name) + '*',
      '│ CATEGORY: *' + cleanLabel(plugin.category) + '*',
      '│ COMMAND : ' + commands.map(item => '*' + item + '*').join(' · '),
      '│',
      '│ ' + cleanLabel(plugin.description, 'Tidak ada deskripsi tambahan.'),
      '│ USAGE   : ' + cleanLabel(plugin.usage, prefix + requested),
      '╰━━━━━━━━━━━━━━━━━━━━━━━━'
    ].join('\n');
  }

  function renderCategory(ctx) {
    const commandPrefix = typeof ctx.prefix === 'string' ? ctx.prefix : Array.isArray(config.prefix) ? (config.prefix[0] || '.') : String(config.prefix || '.');
    const requested = normalizeCategory((ctx.args || [])[0]);
    const categories = getCategories(ctx);
    const theme = preferences.categoryTheme;
    if (!requested) {
      const rows = categories.map((category, index) => ({ category, index, icon: CATEGORY_ICONS[category.slug] || '▣' }));
      let lines;
      if (theme === 'terminal') {
        lines = ['┌─ CATEGORY DIRECTORY', '├─ SELECT CATEGORY'];
        for (const row of rows) lines.push('│ [' + String(row.index + 1).padStart(2, '0') + '] ' + commandPrefix + 'catmenu ' + row.category.slug);
        lines.push('└─ END');
      } else if (theme === 'minimal') {
        lines = ['CATEGORIES', '', ...rows.map(row => row.icon + '  ' + commandPrefix + 'catmenu ' + row.category.slug)];
      } else if (theme === 'premium') {
        lines = ['╔════════════ ✦ CATEGORY COLLECTION ✦ ════════════╗', '║  SELECT A FEATURE SPACE                         ║', '╠═════════════════════════════════════════════════╣'];
        for (const row of rows) lines.push('║  ' + row.icon + '  *' + commandPrefix + 'catmenu ' + row.category.slug + '*');
        lines.push('╚═════════════════════════════════════════════════╝');
      } else if (theme === 'editorial') {
        lines = ['THE CATEGORY INDEX', 'FEATURE DIRECTORY', '────────────────────────────────────', 'CONTENTS'];
        for (const row of rows) lines.push(String(row.index + 1).padStart(2, '0') + ' / ' + row.category.label.toUpperCase() + '  ·  ' + commandPrefix + 'catmenu ' + row.category.slug);
        lines.push('────────────────────────────────────');
      } else {
        lines = frameLines('▣ CATEGORY INDEX', 'showcase', 'PILIH KATEGORI');
        for (const row of rows) lines.push('│ ' + row.icon + '  *' + commandPrefix + 'catmenu ' + row.category.slug + '*');
        if (!rows.length) lines.push('│ Tidak ada kategori aktif.');
        lines.push(FRAME.showcase.bottom);
      }
      lines.push('Gunakan *' + commandPrefix + 'catmenu <kategori>* untuk membuka pilihan fitur.');
      return lines.join('\n');
    }
    const category = categories.find(item => item.slug === requested);
    if (!category) {
      const available = categories.map(item => item.slug).join(', ') || 'belum ada';
      return ['╭━━━━━━━━〔 ✕ CATEGORY NOT FOUND 〕━━━━━━━━', '│ Kategori *' + requested + '* tidak ditemukan atau tidak tersedia.', '│ Pilihan: ' + available, '╰━━━━━━━━━━━━━━━━━━━━━━━━', 'Ketik *' + commandPrefix + 'menu* untuk kembali.'].join('\n');
    }
    const selectedCommand = String((ctx.args || [])[1] || '').trim().toLowerCase();
    if (selectedCommand) {
      const selectedPlugin = category.plugins.find(plugin => plugin.commands.includes(selectedCommand) || plugin.name === selectedCommand);
      if (!selectedPlugin) return 'Fitur *' + selectedCommand + '* tidak ditemukan di kategori *' + category.slug + '*.';
      return renderPluginHelp(ctx, selectedPlugin.commands[0]) || 'Panduan fitur tidak tersedia.';
    }
    const lines = renderCategoryLayout(category, commandPrefix, theme);
    lines.push('Ketik *' + commandPrefix + 'catmenu ' + category.slug + ' <command>* untuk memilih fitur.', 'Ketik *' + commandPrefix + 'menu* untuk kembali.');
    return lines.join('\n').trim();
  }

  async function sendInteractiveList(ctx, { text, buttonText, sectionTitle, rows, fallback }) {
    if (typeof ctx.sendMessage !== 'function' || !rows.length) {
      await ctx.reply(fallback);
      return false;
    }
    const visibleRows = rows.slice(0, 10);
    const messageText = rows.length > visibleRows.length
      ? text + '\nMenampilkan 10 pilihan pertama. Gunakan command teks untuk pilihan lainnya.'
      : text;
    try {
      await ctx.sendMessage(ctx.chat, {
        text: messageText,
        footer: 'BASEBOT',
        buttons: [{
          text: buttonText,
          sections: [{ title: sectionTitle, rows: visibleRows }]
        }]
      });
      return true;
    } catch {
      await ctx.reply(fallback);
      return false;
    }
  }

  async function sendInteractiveMainMenu(ctx) {
    const categories = getCategories(ctx);
    const prefix = typeof ctx.prefix === 'string' ? ctx.prefix : Array.isArray(config.prefix) ? (config.prefix[0] || '.') : String(config.prefix || '.');
    const rows = categories.map(category => ({
      title: cleanLabel(category.label, 'Kategori').slice(0, 24),
      description: cleanLabel(category.plugins.length + ' fitur tersedia', 'Buka kategori', 72),
      id: prefix + 'catmenu ' + category.slug
    }));
    const now = clock();
    const uptime = formatUptime((now.getTime() - startedAt) / 1000);
    const featureCount = categories.reduce((total, category) => total + category.plugins.length, 0);
    const system = getSystemInfo(now, config.timezone, uptime, featureCount);
    const text = [
      '┌─ [ 👤 USER INFO ]',
      '│ ◈ Nama   : ' + cleanLabel(ctx.pushname, 'Pengguna'),
      '│ ◈ Status : ' + (ctx.isOwner ? 'OWNER' : ctx.isGroupAdmin ? 'GROUP ADMIN' : 'MEMBER'),
      '│ ◈ Mode   : ' + (config.publicMode ? 'PUBLIC' : 'SELF'),
      '└──────────────',
      '',
      '┌─ [ SYSTEM INFO ]',
      '│ ◈ WIB    : ' + system.wib,
      '│ ◈ WITA   : ' + system.wita,
      '│ ◈ WIT    : ' + system.wit,
      '│ ◈ Tanggal: ' + system.date,
      '│ ◈ Uptime : ' + system.uptime,
      '│ ◈ OS     : ' + system.os,
      '│ ◈ RAM    : ' + system.ram,
      '│ ◈ Fitur  : ' + system.featureCount + ' Command',
      '└──────────────',
      '',
      '【 ⚙ MAIN MENU 】',
      'BASEBOT SYSTEM DASHBOARD',
      'Pilih kategori melalui daftar interaktif di bawah.'
    ].join('\n');
    return sendInteractiveList(ctx, {
      text,
      buttonText: 'Pilih kategori',
      sectionTitle: 'Kategori fitur',
      rows,
      fallback: renderMenu(ctx)
    });
  }

  async function sendInteractiveCategoryMenu(ctx) {
    const prefix = typeof ctx.prefix === 'string' ? ctx.prefix : Array.isArray(config.prefix) ? (config.prefix[0] || '.') : String(config.prefix || '.');
    const categories = getCategories(ctx);
    const requested = normalizeCategory((ctx.args || [])[0]);
    if (!requested) {
      const rows = categories.map(category => ({
        title: cleanLabel(category.label, 'Kategori').slice(0, 24),
        description: cleanLabel(category.plugins.length + ' fitur tersedia', 'Buka kategori', 72),
        id: prefix + 'catmenu ' + category.slug
      }));
      return sendInteractiveList(ctx, {
        text: '┌─ CATEGORY DIRECTORY\n├─ SELECT CATEGORY\nPilih kategori yang ingin dibuka.',
        buttonText: 'Pilih kategori',
        sectionTitle: 'Kategori',
        rows,
        fallback: renderCategory(ctx)
      });
    }

    const category = categories.find(item => item.slug === requested);
    if (!category) {
      await ctx.reply(renderCategory(ctx));
      return false;
    }
    const plugins = [...category.plugins].sort((a, b) => a.name.localeCompare(b.name, 'id'));
    const rows = plugins.map(plugin => {
      const command = (plugin.commands || [])[0] || plugin.name;
      return {
        title: cleanLabel(command, 'Fitur').slice(0, 24),
        description: cleanLabel(plugin.description, 'Jalankan fitur ini.', 72),
        id: prefix + command
      };
    });
    return sendInteractiveList(ctx, {
      text: '┌─ ' + categoryTitle(category) + '\n├─ FEATURE DIRECTORY\nPilih fitur untuk menjalankannya.',
      buttonText: 'Pilih fitur',
      sectionTitle: cleanLabel(category.label, 'Fitur'),
      rows,
      fallback: renderCategory(ctx)
    });
  }

  return Object.freeze({
    canHandle(command) { return ['menu', 'help', 'catmenu'].includes(command); },
    async execute(ctx) {
      if (ctx.command === 'menu' && preferences.menuTheme === 'terminal') {
        await sendInteractiveMainMenu(ctx);
      } else if (ctx.command === 'catmenu' && preferences.categoryTheme === 'terminal' && (ctx.args || []).length < 2) {
        await sendInteractiveCategoryMenu(ctx);
      } else {
        const output = ctx.command === 'catmenu'
          ? renderCategory(ctx)
          : ctx.command === 'help' && (ctx.args || []).length
            ? (renderPluginHelp(ctx, ctx.args[0]) || 'Fitur tidak ditemukan atau tidak tersedia untuk akun ini.')
            : renderMenu(ctx);
        await ctx.reply(output);
      }
      return { handled: true, command: ctx.command };
    },
    renderMenu, renderCategory, renderPluginHelp, getCategories, getNextTheme, setTheme, themes: MENU_THEMES, themeVersions: MENU_THEME_VERSIONS, preferences
  });
}

module.exports = { createMenuService, normalizeCategory, formatUptime, MENU_THEMES, CATEGORY_LAYOUTS };
