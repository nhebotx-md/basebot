'use strict';

const os = require('node:os');
const { validatePermission } = require('../security/permission-manager');

const CATEGORY_ICONS = Object.freeze({
  owner: '👑', main: '⌂', system: '◈', utility: '⌘', tools: '⚙', image: '▧', account: '♙',
  fun: '✦', game: '◇', download: '⇩', downloader: '⇩', search: '⌕',
  sticker: '▧', media: '▣', ai: '✧', group: '◎', religi: '☾',
  islamic: '☾', info: 'ⓘ', user: '♙', canvas: '▤', random: '⁕',
  panel: '▦', vps: '⌁', anime: '✿', finance: '＄', news: '▤',
  convert: '⇄', rpg: '⚔', tts: '♫'
});
const MENU_THEMES = Object.freeze(['showcase', 'terminal', 'minimal', 'premium', 'editorial']);
const MENU_THEME_VERSIONS = Object.freeze({ v1: 'showcase', v2: 'terminal', v3: 'minimal', v4: 'premium', v5: 'editorial' });
const CATEGORY_LAYOUTS = Object.freeze({
  owner: 'control', system: 'control', panel: 'control', vps: 'control', tools: 'directory',
  download: 'media', downloader: 'media', media: 'media', sticker: 'media',
  ai: 'assistant', search: 'assistant', tts: 'assistant', image: 'media', account: 'community',
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

function renderCategoryLayout(category, prefix, theme = 'showcase', detailed = false) {
  const icon = CATEGORY_ICONS[category.slug] || '▣';
  const heading = icon + ' ' + categoryTitle(category);
  const plugins = [...category.plugins].sort((a, b) => a.name.localeCompare(b.name, 'id'));
  const commandCount = plugins.reduce((total, plugin) => total + Math.max(1, (plugin.commands || []).length), 0);
  const premium = theme === 'premium';
  const lines = premium
    ? [
        '╔══════════════ ' + heading + ' ══════════════╗',
        '║  CATEGORY PROFILE',
        '║  CATEGORY  ' + cleanLabel(category.label),
        '║  PLUGINS   ' + plugins.length,
        '║  COMMANDS  ' + commandCount,
        '╠══════════════ PLUGIN DIRECTORY ═════════════╣'
      ]
    : [
        '┌─ [ ' + heading + ' ]',
        '│ ◈ Kategori : ' + cleanLabel(category.label),
        '│ ◈ Plugin   : ' + plugins.length,
        '│ ◈ Command  : ' + commandCount,
        '├─ [ DAFTAR PLUGIN & FITUR ]'
      ];

  for (const [index, plugin] of plugins.entries()) {
    const number = String(index + 1).padStart(2, '0');
    const commands = (plugin.commands || []).length ? plugin.commands : [plugin.name];
    const commandChunks = [];
    if (detailed) {
      for (let offset = 0; offset < commands.length; offset += 5) {
        commandChunks.push(commands.slice(offset, offset + 5).map(command => prefix + command).join(', '));
      }
    }

    if (theme === 'terminal') lines.push('│ [' + number + '] ' + cleanLabel(plugin.name));
    else if (theme === 'minimal') lines.push(number + '. ' + cleanLabel(plugin.name));
    else if (theme === 'premium') lines.push('║  ' + number + '  ◇  *' + cleanLabel(plugin.name) + '*');
    else if (theme === 'editorial') lines.push(number + ' / ' + cleanLabel(plugin.name).toUpperCase());
    else lines.push('│ ◈ ' + number + '  *' + cleanLabel(plugin.name) + '*');

    if (detailed) {
      for (let chunkIndex = 0; chunkIndex < commandChunks.length; chunkIndex += 1) {
        const label = chunkIndex === 0 ? 'Command: ' : '         ';
        lines.push((premium ? '║    ' : '│    ') + label + commandChunks[chunkIndex]);
      }
      if (plugin.description) lines.push((premium ? '║    ' : '│    ') + 'Fungsi : ' + cleanLabel(plugin.description));
      if (plugin.usage) lines.push((premium ? '║    ' : '│    ') + 'Pakai  : ' + cleanLabel(plugin.usage));
    }
    if (index < plugins.length - 1) lines.push(premium ? '║' : '│');
  }

  if (!plugins.length) lines.push(premium ? '║  Belum ada plugin aktif di kategori ini.' : '│ Belum ada plugin aktif di kategori ini.');
  lines.push(premium ? '╚═════════════════════════════════════════════╝' : '└──────────────────────────────');
  return lines;
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
    const internalMenuPlugins = new Set(['basebot-menu', 'basebot-catmenu', 'basebot-allmenu']);
    return registry.list({ includeDisabled: false })
      .filter(plugin => !internalMenuPlugins.has(plugin.name))
      .filter(plugin => validatePermission(plugin, ctx).allowed);
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
    const system = getSystemInfo(now, config.timezone, uptime, countCommands(categories));
    const rows = categories.map((category, index) => {
      const command = commandPrefix + 'catmenu ' + category.slug;
      const count = category.plugins.reduce((total, plugin) => total + Math.max(1, (plugin.commands || []).length), 0);
      return { category, index, command, count, icon: CATEGORY_ICONS[category.slug] || '▣' };
    });
    const profile = ['USER     ' + userName, 'ROLE     ' + role, 'MODE     ' + mode, 'VERSION  v' + cleanLabel(version), 'PREFIX   ' + prefixLabel];
    const systemLines = [
      'WIB ' + system.wib + '  |  WITA ' + system.wita + '  |  WIT ' + system.wit,
      'DATE ' + system.date,
      'UPTIME ' + uptime + '  |  RAM ' + system.ram,
      'PLUGINS ' + categories.reduce((sum, category) => sum + category.plugins.length, 0) + '  |  COMMANDS ' + system.featureCount
    ];
    let lines;
    if (theme === 'terminal') {
      lines = ['┏━━━ ' + botName.toUpperCase() + ' :: TERMINAL ━━━', '┃ SESSION / ' + userName, '┃ ACCESS  / ' + role, '┃ MODE    / ' + mode, '┣━━ SYSTEM STATUS ━━━━━━━━━━━━━', ...systemLines.map(line => '┃ ' + line), '┣━━ COMMAND INDEX ━━━━━━━━━━━━━'];
      for (const row of rows) lines.push('┃ [' + String(row.index + 1).padStart(2, '0') + '] ' + row.command);
      lines.push('┗━━ END :: ' + rows.length + ' CATEGORIES ━━━');
    } else if (theme === 'minimal') {
      lines = [botName.toUpperCase() + '  /  MENU', userName + ' · ' + role + ' · ' + mode, 'v' + cleanLabel(version) + '  |  ' + prefixLabel, '────────────────────────', ...rows.map(row => row.command + '  (' + row.count + ')'), '────────────────────────', ...systemLines];
    } else if (theme === 'premium') {
      lines = ['╔══════════════ ' + botName.toUpperCase() + ' ══════════════╗', '║              THE FEATURE LOUNGE              ║', '╠════════════════ MEMBER PROFILE ══════════════╣', '║  ' + userName + '  ·  ' + role, '║  ' + mode + '  ·  v' + cleanLabel(version), '║  PREFIX  ' + prefixLabel, '╠════════════════ SYSTEM STATUS ═══════════════╣', ...systemLines.map(line => '║  ' + line), '╠════════════════ CATEGORY LIST ══════════════╣'];
      for (const row of rows) lines.push('║  ' + row.icon + '  *' + row.command + '*  ·  ' + row.count + ' commands');
      lines.push('╚══════════════════════════════════════════════╝');
    } else if (theme === 'editorial') {
      lines = [botName.toUpperCase() + ' / FIELD GUIDE', 'A directory of tools available in this session', '────────────────────────────────────────', ...profile, '', '01 / SYSTEM SNAPSHOT', ...systemLines.map(line => '   ' + line), '', '02 / CONTENTS'];
      for (const row of rows) lines.push(String(row.index + 1).padStart(2, '0') + '   ' + row.category.label.toUpperCase() + '\n     ' + row.command);
      lines.push('────────────────────────────────────────', 'Open a section with ' + commandPrefix + 'catmenu <category>');
    } else {
      lines = ['╭─〔 ' + botName + ' / FEATURE MENU 〕', '│ ' + userName + '  •  ' + role + '  •  ' + mode, '│ v' + cleanLabel(version) + '  •  Prefix: ' + prefixLabel, '├─〔 SYSTEM 〕', ...systemLines.map(line => '│ ' + line), '├─〔 CATEGORY 〕'];
      for (const row of rows) lines.push('│ ' + row.icon + '  *' + row.command + '*  ·  ' + row.category.plugins.length + ' plugin / ' + row.count + ' command');
      lines.push('╰────────────────────────');
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

  function renderCategory(ctx, { detailed = false, categoryAlias = false } = {}) {
    const commandPrefix = typeof ctx.prefix === 'string' ? ctx.prefix : Array.isArray(config.prefix) ? (config.prefix[0] || '.') : String(config.prefix || '.');
    const requested = normalizeCategory((ctx.args || [])[0] || (categoryAlias ? ctx.command : ''));
    const categories = getCategories(ctx);
    const theme = preferences.categoryTheme;
    if (!requested) {
      const rows = categories.map((category, index) => ({
        category, index, icon: CATEGORY_ICONS[category.slug] || '▣',
      }));
      let lines;
      if (theme === 'terminal') {
        lines = ['╔══ CATEGORY CONSOLE ═════════════', '║ SELECT A CATEGORY'];
        for (const row of rows) lines.push('║ ' + String(row.index + 1).padStart(2, '0') + ' > ' + commandPrefix + 'catmenu ' + row.category.slug);
        lines.push('╚══ ' + rows.length + ' CATEGORIES ═════════════');
      } else if (theme === 'minimal') {
        lines = ['CATEGORY INDEX', '────────────────────────', ...rows.map(row => commandPrefix + 'catmenu ' + row.category.slug), '────────────────────────'];
      } else if (theme === 'premium') {
        lines = ['╔══════════════ ✦ CATEGORY COLLECTION ✦ ══════════════╗', '║               CHOOSE YOUR WORKSPACE              ║', '╠══════════════════════════════════════════════════╣'];
        for (const row of rows) lines.push('║  ' + row.icon + '  *' + commandPrefix + 'catmenu ' + row.category.slug + '*');
        lines.push('╚══════════════════════════════════════════════════╝');
      } else if (theme === 'editorial') {
        lines = ['THE CATEGORY INDEX', 'A guide to the available feature collections', '────────────────────────────────────────'];
        for (const row of rows) lines.push(String(row.index + 1).padStart(2, '0') + ' / ' + row.category.label.toUpperCase() + '\n     ' + commandPrefix + 'catmenu ' + row.category.slug);
        lines.push('────────────────────────────────────────');
      } else {
        lines = ['╭─〔 CATEGORY MENU 〕', '│ Pilih kategori untuk melihat daftar fitur'];
        for (const row of rows) lines.push('│ ' + row.icon + '  *' + commandPrefix + 'catmenu ' + row.category.slug + '*');
        if (!rows.length) lines.push('│ Belum ada kategori aktif.');
        lines.push('╰────────────────────────');
      }
      lines.push('Gunakan *' + commandPrefix + 'catmenu <kategori>* untuk membuka kategori.');
      return lines.join('\n');
    }
    const category = categories.find(item => item.slug === requested);
    if (!category) {
      const available = categories.map(item => item.slug).join(', ') || 'belum ada';
      if (theme === 'premium') {
        return ['╭━━━━━━━━〔 CATEGORY NOT FOUND 〕', '│ Kategori *' + requested + '* tidak ditemukan.', '│ Tersedia: ' + available, '╰━━━━━━━━━━━━━━━━━━━━━━━━', 'Ketik *' + commandPrefix + 'menu* untuk kembali.'].join('\n');
      }
      if (theme === 'terminal') {
        return ['╔══ CATEGORY NOT FOUND ═════════════', '║ Kategori *' + requested + '* tidak ditemukan.', '║ Tersedia: ' + available, '╚════════════════════════════════════', 'Ketik *' + commandPrefix + 'menu* untuk kembali.'].join('\n');
      }
      if (theme === 'editorial') {
        return ['CATEGORY NOT FOUND', 'Kategori *' + requested + '* tidak ditemukan.', 'Tersedia: ' + available, '────────────────────────────────────────', 'Ketik *' + commandPrefix + 'menu* untuk kembali.'].join('\n');
      }
      return ['╭─〔 CATEGORY NOT FOUND 〕', '│ Kategori *' + requested + '* tidak ditemukan.', '│ Tersedia: ' + available, '╰────────────────────────', 'Ketik *' + commandPrefix + 'menu* untuk kembali.'].join('\n');
    }
    const selectedCommand = String((ctx.args || [])[1] || '').trim().toLowerCase();
    if (selectedCommand) {
      const selectedPlugin = category.plugins.find(plugin => (plugin.commands || []).includes(selectedCommand) || plugin.name === selectedCommand);
      if (!selectedPlugin) return 'Fitur *' + selectedCommand + '* tidak ditemukan di kategori *' + category.slug + '*.';
      return renderPluginHelp(ctx, (selectedPlugin.commands || [])[0]) || 'Panduan fitur tidak tersedia.';
    }
    const plugins = [...category.plugins].sort((a, b) => a.name.localeCompare(b.name, 'id'));
    const heading = categoryTitle(category);
    const addDetails = (plugin, frame = '│') => {
      if (!detailed) return;
      const commands = (plugin.commands || []).filter(Boolean);
      if (commands.length) lines.push(frame + '    Command: ' + commands.map(command => commandPrefix + command).join('  |  '));
      if (plugin.description) lines.push(frame + '    Fungsi : ' + cleanLabel(plugin.description));
      if (plugin.usage) lines.push(frame + '    Pakai  : ' + cleanLabel(plugin.usage));
    };
    let lines;
    if (theme === 'terminal') {
      lines = ['╔══ ' + heading + ' ═════════════', '║ PATH / ' + commandPrefix + 'catmenu ' + category.slug, '║ PLUGIN : ' + plugins.length, '╠══ AVAILABLE MODULES ═════════'];
      for (const [index, plugin] of plugins.entries()) {
        lines.push('║ [' + String(index + 1).padStart(2, '0') + '] ' + cleanLabel(plugin.name));
        addDetails(plugin, '║');
      }
      lines.push('╚══ END / ' + plugins.length + ' MODULES ═════════');
    } else if (theme === 'minimal') {
      lines = [heading, '────────────────────────'];
      for (const plugin of plugins) {
        lines.push(cleanLabel(plugin.name));
        addDetails(plugin);
      }
      lines.push('────────────────────────');
    } else if (theme === 'premium') {
      lines = ['╔══════════════ ' + heading + ' ══════════════╗', '║              FEATURE COLLECTION               ║', '║  PLUGINS ' + plugins.length, '╠════════════════════════════════════════════════╣'];
      for (const [index, plugin] of plugins.entries()) {
        lines.push('║  ' + String(index + 1).padStart(2, '0') + '  ◇  *' + cleanLabel(plugin.name) + '*');
        addDetails(plugin, '║');
      }
      lines.push('╚════════════════════════════════════════════════╝');
    } else if (theme === 'editorial') {
      lines = [category.label.toUpperCase() + ' / FEATURE NOTES', 'A categorized list of available plugins', '────────────────────────────────────────'];
      for (const [index, plugin] of plugins.entries()) {
        lines.push(String(index + 1).padStart(2, '0') + ' / ' + cleanLabel(plugin.name).toUpperCase());
        addDetails(plugin, ' ');
      }
      lines.push('────────────────────────────────────────');
    } else {
      lines = ['╭─〔 ' + heading + ' 〕', '│ ' + plugins.length + ' fitur tersedia'];
      for (const plugin of plugins) {
        lines.push('├─ ' + cleanLabel(plugin.name));
        addDetails(plugin);
      }
      lines.push('╰────────────────────────');
    }
    lines.push(detailed ? 'Ketik *' + commandPrefix + 'menu* untuk kembali.' : 'Ketik *' + commandPrefix + category.slug + '* untuk panduan lengkap.');
    return lines.join('\n').trim();
  }

  async function sendInteractiveList(ctx, { text, buttonText, sectionTitle, rows, fallback }) {
    if (typeof ctx.sendMessage !== 'function' || !rows.length || rows.length > 10) {
      await ctx.reply(fallback);
      return false;
    }
    try {
      await ctx.sendMessage(ctx.chat, {
        text,
        footer: 'BASEBOT',
        buttons: [{
          text: buttonText,
          sections: [{ title: sectionTitle, rows }]
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
      description: cleanLabel(category.plugins.length + ' plugin / ' + category.plugins.reduce((total, plugin) => total + Math.max(1, (plugin.commands || []).length), 0) + ' command', 'Buka kategori'),
      id: prefix + 'catmenu ' + category.slug
    }));
    const now = clock();
    const uptime = formatUptime((now.getTime() - startedAt) / 1000);
    const featureCount = countCommands(categories);
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
    const rows = plugins.map(plugin => ({
      title: cleanLabel(plugin.name, 'Fitur').slice(0, 24),
      id: prefix + ((plugin.commands || [])[0] || plugin.name)
    }));
    return sendInteractiveList(ctx, {
      text: '┌─ ' + categoryTitle(category) + '\n├─ FEATURE DIRECTORY\nPilih fitur untuk menjalankannya.',
      buttonText: 'Pilih fitur',
      sectionTitle: cleanLabel(category.label, 'Fitur'),
      rows,
      fallback: renderCategory(ctx)
    });
  }

  function renderAllMenu(ctx) {
    const categories = getCategories(ctx);
    const prefix = typeof ctx.prefix === 'string' && ctx.prefix
      ? ctx.prefix
      : (Array.isArray(config.prefix) ? config.prefix[0] : config.prefix) || '.';

    const sections = categories.map(category => {
      const commands = [...category.plugins]
        .sort((a, b) => a.name.localeCompare(b.name, 'id'))
        .flatMap(plugin => {
          const available = (plugin.commands || []).filter(Boolean);
          return available.length ? available : [plugin.name];
        });
      const uniqueCommands = [...new Set(commands)];
      return [
        '╭─〔 ' + cleanLabel(category.label).toLocaleUpperCase('id-ID') + ' 〕',
        ...uniqueCommands.map(command => '│ ' + prefix + command),
        '╰' + '─'.repeat(24)
      ].join('\n');
    });

    if (!sections.length) return 'Tidak ada command yang tersedia.';
    const output = sections.join('\n\n');
    const READ_MORE_THRESHOLD = 1800;
    const READ_MORE_MARKER = '\u200e'.repeat(4001);
    if (output.length <= READ_MORE_THRESHOLD) return output;

    // Prefer splitting between categories; if there is only one long category,
    // split after a complete command line instead of cutting through a command.
    let splitAt = output.indexOf('\n\n', READ_MORE_THRESHOLD);
    let separatorLength = 2;
    if (splitAt < 0) {
      splitAt = output.indexOf('\n', READ_MORE_THRESHOLD);
      separatorLength = 1;
    }
    if (splitAt < 0) return output;
    return output.slice(0, splitAt) + '\n' + READ_MORE_MARKER + '\n' + output.slice(splitAt + separatorLength);
  }

  return Object.freeze({
    canHandle(command) {
      if (registry.getByCommand?.(command)) return false;
      if (['menu', 'help', 'catmenu'].includes(command)) return true;
      if (registry.getByCommand?.(command)) return false;
      return registry.list({ includeDisabled: true }).some(plugin => normalizeCategory(plugin.category) === command);
    },
    async execute(ctx) {
      const categoryAlias = !['menu', 'help', 'catmenu'].includes(ctx.command);
      if (categoryAlias) {
        await ctx.reply(renderCategory(ctx, { detailed: true, categoryAlias: true }));
      } else {
        const output = ctx.command === 'catmenu'
          ? renderCategory(ctx, { detailed: false })
          : ctx.command === 'help' && (ctx.args || []).length
            ? (renderPluginHelp(ctx, ctx.args[0]) || 'Fitur tidak ditemukan atau tidak tersedia untuk akun ini.')
            : renderMenu(ctx);
        await ctx.reply(output);
      }
      return { handled: true, command: ctx.command };
    },
    renderMenu, renderCategory, renderAllMenu, renderPluginHelp, getCategories, getNextTheme, setTheme, themes: MENU_THEMES, themeVersions: MENU_THEME_VERSIONS, preferences
  });
}

module.exports = { createMenuService, normalizeCategory, formatUptime, MENU_THEMES, CATEGORY_LAYOUTS };
