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

// Lebar isi kotak (di luar spasi pembatas). Semua tema berbagi struktur yang
// sama — header, profil, status sistem, daftar, panduan — hanya bahasanya
// yang berbeda, sehingga lebar garis selalu rata di tiap tema.
const CONTENT_WIDTH = 46;

function displayWidth(text) {
  return [...String(text)].length;
}
function truncateTo(text, width) {
  const chars = [...String(text)];
  if (chars.length <= width) return String(text);
  return chars.slice(0, Math.max(0, width - 1)).join('') + '…';
}
function padTo(text, width) {
  const len = displayWidth(text);
  return len >= width ? String(text) : String(text) + ' '.repeat(width - len);
}
// Bungkus teks per kata agar tidak ada baris yang melewati tepi kotak.
// Baris yang sudah muat dikembalikan apa adanya supaya spasi perata
// (label profil, indentasi) tidak ikut diratakan.
function wrapText(text, width) {
  if (displayWidth(text) <= width) return [String(text)];
  const words = [];
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    let rest = word;
    while (displayWidth(rest) > width) {
      words.push([...rest].slice(0, width).join(''));
      rest = [...rest].slice(width).join('');
    }
    words.push(rest);
  }
  const lines = [];
  let current = '';
  for (const word of words) {
    if (!current) { current = word; continue; }
    if (displayWidth(current) + 1 + displayWidth(word) <= width) current += ' ' + word;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

const BOX_FRAMES = Object.freeze({
  showcase: Object.freeze({ topLeft: '╭', topRight: '╮', bottomLeft: '╰', bottomRight: '╯', horizontal: '━', vertical: '│', teeLeft: '├', teeRight: '┤', sectionHorizontal: '─' }),
  terminal: Object.freeze({ topLeft: '┌', topRight: '┐', bottomLeft: '└', bottomRight: '┘', horizontal: '─', vertical: '┃', teeLeft: '┣', teeRight: '┫', sectionHorizontal: '─' }),
  premium: Object.freeze({ topLeft: '╔', topRight: '╗', bottomLeft: '╚', bottomRight: '╝', horizontal: '═', vertical: '║', teeLeft: '╠', teeRight: '╣', sectionHorizontal: '═' })
});

// Nama bab untuk tema editorial, mengikuti gaya panduan/majalah.
const EDITORIAL_SECTIONS = Object.freeze({
  PROFILE: 'PROFILE',
  'SYSTEM STATUS': 'SYSTEM SNAPSHOT',
  CATEGORY: 'CONTENTS',
  PANDUAN: 'GUIDE',
  'CATEGORY PROFILE': 'CATEGORY PROFILE',
  'PLUGIN DIRECTORY': 'FEATURE NOTES'
});

// Satu mesin frame untuk kelima tema: top(title), section(title),
// line(text), blank() dan bottom(). Tema kotak (showcase/terminal/premium)
// memakai bingkai tertutup dengan lebar yang dihitung, sedangkan minimal
// dan editorial memakai garis tipis tanpa kotak.
function makeFrame(theme) {
  if (theme === 'minimal') {
    return {
      theme,
      top: title => [title],
      section: title => ['── ' + title],
      line: text => [text],
      blank: () => [''],
      bottom: () => ['─'.repeat(28)]
    };
  }
  if (theme === 'editorial') {
    let sectionIndex = 0;
    return {
      theme,
      top: title => [title, '─'.repeat(40)],
      section: title => {
        sectionIndex += 1;
        const label = EDITORIAL_SECTIONS[title] || title;
        return [String(sectionIndex).padStart(2, '0') + ' / ' + label];
      },
      line: text => ['   ' + text],
      blank: () => [''],
      bottom: () => ['─'.repeat(40)]
    };
  }
  const frame = BOX_FRAMES[theme] || BOX_FRAMES.showcase;
  const inner = CONTENT_WIDTH + 2;
  return {
    theme,
    top(title) {
      const clean = truncateTo(title, inner - 8);
      if (theme === 'premium') {
        const label = ' ' + clean + ' ';
        const fill = Math.max(2, inner - 2 - displayWidth(label));
        return [frame.topLeft + frame.horizontal.repeat(2) + label + frame.horizontal.repeat(fill) + frame.topRight];
      }
      const label = frame.horizontal + '〔 ' + clean + ' 〕';
      const fill = Math.max(2, inner - displayWidth(label));
      return [frame.topLeft + label + frame.horizontal.repeat(fill) + frame.topRight];
    },
    section(title) {
      const clean = truncateTo(title, inner - 8);
      const label = frame.sectionHorizontal + '〔 ' + clean + ' 〕';
      const fill = Math.max(2, inner - displayWidth(label));
      return [frame.teeLeft + label + frame.sectionHorizontal.repeat(fill) + frame.teeRight];
    },
    line(text) {
      return wrapText(text, CONTENT_WIDTH)
        .map(chunk => frame.vertical + ' ' + padTo(chunk, CONTENT_WIDTH) + ' ' + frame.vertical);
    },
    blank() {
      return [frame.vertical + ' '.repeat(CONTENT_WIDTH + 2) + frame.vertical];
    },
    bottom() {
      return [frame.bottomLeft + frame.horizontal.repeat(inner) + frame.bottomRight];
    }
  };
}

// Merakit satu tampilan dari blok-blok yang sama untuk semua tema:
// judul, baris pembuka, lalu tiap seksi (nama + baris isi), lalu panduan.
function assembleMenu(frame, { title, lead = [], sections = [], footer = [] }) {
  const lines = [];
  lines.push(...frame.top(title));
  for (const text of lead) lines.push(...frame.line(text));
  for (const section of sections) {
    lines.push(...frame.section(section.name));
    for (const text of section.lines) lines.push(...frame.line(text));
  }
  if (footer.length) {
    lines.push(...frame.section('PANDUAN'));
    for (const text of footer) lines.push(...frame.line(text));
  }
  lines.push(...frame.bottom());
  return lines.join('\n');
}

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

// Baris kategori bernomor dengan jumlah plugin/command dan perintah pembuka.
// Formatnya sama di semua tema; hanya penanda nomor dan ikon yang menyesuaikan.
function categoryRow(theme, category, index, commandPrefix) {
  const num = String(index + 1).padStart(2, '0');
  const icon = CATEGORY_ICONS[category.slug] || '▣';
  const pluginCount = category.plugins.length;
  const commandCount = category.plugins.reduce((total, plugin) => total + Math.max(1, (plugin.commands || []).length), 0);
  const counts = pluginCount + ' plugin / ' + commandCount + ' command';
  let main;
  if (theme === 'editorial') main = num + '   ' + category.label.toUpperCase() + ' — ' + counts;
  else if (theme === 'minimal') main = num + '. ' + icon + ' ' + category.label + ' — ' + counts;
  else if (theme === 'terminal') main = '[' + num + '] ' + icon + ' ' + category.label + '  ·  ' + counts;
  else if (theme === 'premium') main = num + '  ' + icon + '  *' + category.label + '*  ·  ' + counts;
  else main = num + '  ' + icon + '  ' + category.label + '  ·  ' + counts;
  return { main, sub: '     ' + commandPrefix + 'catmenu ' + category.slug };
}

// Satu baris fitur di dalam direktori kategori (tampilan ringkas: nama saja,
// tanpa alias command atau deskripsi, supaya daftar tetap mudah dipindai).
function categoryPluginLine(theme, plugin, index) {
  const num = String(index + 1).padStart(2, '0');
  const name = cleanLabel(plugin.name);
  if (theme === 'terminal') return '[' + num + '] ' + name;
  if (theme === 'minimal') return num + '. ' + name;
  if (theme === 'premium') return num + '  ◇  *' + name + '*';
  if (theme === 'editorial') return num + ' / ' + name.toUpperCase();
  return num + '  ◆  *' + name + '*';
}

// Cuplikan kecil tiap tema untuk pemilih tema (.setmenu / .setcatmenu).
function themePreview(theme, botName) {
  if (theme === 'terminal') return '┌─ TERMINAL';
  if (theme === 'minimal') return botName + ' / MENU';
  if (theme === 'premium') return '╔═ THE FEATURE LOUNGE';
  if (theme === 'editorial') return botName + ' / FIELD GUIDE';
  return '╭━ FEATURE MENU';
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
    const internalMenuPlugins = new Set(['muse-menu', 'muse-catmenu', 'muse-allmenu']);
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
      const botName = cleanLabel(config.botName, 'MUSE-MD');
      return ['╭━━━━━━━━〔 MENU THEME SETTINGS 〕', '│ Pengaturan: *' + (isCategory ? 'CATEGORY MENU' : 'MAIN MENU') + '*', '│ Tema aktif: *' + currentVersion + '* (' + current + ')', '┣━━━━━━━━━━━━━━━━━━━━━━━━', ...Object.entries(MENU_THEME_VERSIONS).map(([v, theme]) => '│ ' + v.toUpperCase() + '  •  ' + theme.toUpperCase() + '  —  ' + themePreview(theme, botName)), '╰━━━━━━━━━━━━━━━━━━━━━━━━', 'Gunakan *' + (ctx.prefix || '.') + command + ' v1-v5* untuk memilih tema.'].join('\n');
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
    const botName = cleanLabel(config.botName, 'MUSE-MD');
    const mode = config.publicMode ? 'PUBLIC' : 'SELF';
    const commandPrefix = Array.isArray(config.prefix) ? (config.prefix[0] || '.') : String(config.prefix || '.');
    const prefixLabel = Array.isArray(config.prefix) ? config.prefix.join(' / ') : commandPrefix;
    const uptime = formatUptime((now.getTime() - startedAt) / 1000);
    const system = getSystemInfo(now, config.timezone, uptime, countCommands(categories));
    const pluginCount = categories.reduce((sum, category) => sum + category.plugins.length, 0);
    const rows = categories.map((category, index) => categoryRow(theme, category, index, commandPrefix));
    const profile = ['USER     ' + userName, 'ROLE     ' + role, 'MODE     ' + mode, 'VERSION  v' + cleanLabel(version), 'PREFIX   ' + prefixLabel];
    const systemLines = [
      'WIB ' + system.wib + '  ·  WITA ' + system.wita,
      'WIT ' + system.wit,
      'DATE ' + system.date,
      'UPTIME ' + uptime,
      'RAM ' + system.ram,
      'PLUGINS ' + pluginCount + '  ·  COMMANDS ' + system.featureCount,
      'KATEGORI ' + categories.length
    ];
    const categoryLines = [];
    if (!rows.length) categoryLines.push('Belum ada kategori aktif.');
    for (const row of rows) {
      categoryLines.push(row.main);
      categoryLines.push(row.sub);
    }
    const footer = [
      'Buka kategori: ' + commandPrefix + 'catmenu <kategori>',
      'Panduan fitur: ' + commandPrefix + 'help <command>',
      'Daftar lengkap: ' + commandPrefix + 'allmenu',
      botName + ' v' + cleanLabel(version)
    ];
    const frame = makeFrame(theme);
    const titles = {
      showcase: botName + ' / FEATURE MENU',
      terminal: botName + ' :: TERMINAL',
      minimal: botName + '  /  MENU',
      premium: botName,
      editorial: botName + ' / FIELD GUIDE'
    };
    const lead = [];
    if (theme === 'premium') lead.push('✦  THE FEATURE LOUNGE  ✦');
    if (theme === 'editorial') lead.push('A directory of tools available in this session');
    if (theme === 'showcase' || theme === 'terminal' || theme === 'premium') lead.push(system.date + '  •  ' + system.wib + ' WIB');
    return assembleMenu(frame, {
      title: titles[theme],
      lead,
      sections: [
        { name: 'PROFILE', lines: profile },
        { name: 'SYSTEM STATUS', lines: systemLines },
        { name: 'CATEGORY', lines: categoryLines }
      ],
      footer
    });
  }

  function renderPluginHelp(ctx, command) {
    const requested = String(command || '').trim().toLocaleLowerCase('id-ID');
    const plugin = registry.getByCommand?.(requested);
    if (!plugin || !validatePermission(plugin, ctx).allowed) return null;
    const prefix = ctx.prefix || (Array.isArray(config.prefix) ? config.prefix[0] : config.prefix) || '.';
    const commands = (plugin.commands || []).map(item => prefix + item);
    const frame = makeFrame('showcase');
    return [
      ...frame.top('FEATURE GUIDE'),
      ...frame.line('FEATURE : *' + cleanLabel(plugin.name) + '*'),
      ...frame.line('CATEGORY: *' + cleanLabel(plugin.category) + '*'),
      ...frame.line('COMMAND : ' + commands.map(item => '*' + item + '*').join(' · ')),
      ...frame.blank(),
      ...frame.line(cleanLabel(plugin.description, 'Tidak ada deskripsi tambahan.')),
      ...frame.line('USAGE   : ' + cleanLabel(plugin.usage, prefix + requested)),
      ...frame.bottom()
    ].join('\n');
  }

function renderCategory(ctx, { detailed = false, categoryAlias = false} = {}) {
const commandPrefix = typeof ctx.prefix === 'string'? ctx.prefix: Array.isArray(config.prefix)? (config.prefix[0] || '.'): String(config.prefix || '.');
const requested = normalizeCategory((ctx.args || [])[0] || (categoryAlias? ctx.command: ''));
const categories = getCategories(ctx);
const theme = preferences.categoryTheme;
const frame = makeFrame(theme);
if (!requested) {
const titles = {
showcase: 'CATEGORY MENU',
terminal: 'CATEGORY CONSOLE',
minimal: 'CATEGORY INDEX',
premium: '✦ CATEGORY COLLECTION ✦',
editorial: 'THE CATEGORY INDEX'
};
const lead = [];
if (theme === 'showcase') lead.push('Pilih kategori untuk melihat daftar fitur');
if (theme === 'editorial') lead.push('A guide to the available feature collections');
if (theme === 'premium') lead.push('CHOOSE YOUR WORKSPACE');
const rows = categories.map((category, index) => categoryRow(theme, category, index, commandPrefix));
const lines = [];
if (!rows.length) lines.push('Belum ada kategori aktif.');
for (const row of rows) {
lines.push(row.main);
lines.push(row.sub);
}
return assembleMenu(frame, {
title: titles[theme],
lead,
sections: [{ name: 'CATEGORY', lines}],
footer: ['Gunakan *' + commandPrefix + 'catmenu <kategori>* untuk membuka kategori.']
});
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
const commandCount = plugins.reduce((total, plugin) => total + Math.max(1, (plugin.commands || []).length), 0);
const heading = categoryTitle(category);
const profileLines = {
showcase: ['Kategori: ' + cleanLabel(category.label), 'Plugin: ' + plugins.length, 'Perintah: ' + commandCount],
terminal: ['PLUGIN: ' + plugins.length, 'PERINTAH: ' + commandCount],
minimal: ['Kategori: ' + cleanLabel(category.label), 'Plugin: ' + plugins.length, 'Perintah: ' + commandCount],
premium: ['PLUGINS ' + plugins.length, 'PERINTAH ' + commandCount],
editorial: ['PLUGINS ' + plugins.length, 'PERINTAH ' + commandCount]
}[theme];
const pluginLines = [];
for (const [index, plugin] of plugins.entries()) {
pluginLines.push(categoryPluginLine(theme, plugin, index));
if (detailed) {
const commands = (plugin.commands || []).filter(Boolean);
if (commands.length) pluginLines.push(' Command: ' + commands.map(item => commandPrefix + item).join(' | '));
if (plugin.description) pluginLines.push(' Fungsi: ' + cleanLabel(plugin.description));
if (plugin.usage) pluginLines.push(' Pakai: ' + cleanLabel(plugin.usage));
}
}
if (!plugins.length) pluginLines.push('Belum ada plugin aktif di kategori ini.');
const listSection = {
showcase: 'PLUGIN DIRECTORY',
terminal: 'AVAILABLE MODULES',
minimal: 'PLUGIN DIRECTORY',
premium: 'FEATURE COLLECTION',
editorial: 'FEATURE NOTES'
}[theme];
const lead = [];
if (theme === 'editorial') lead.push('A categorized list of available plugins');
if (theme === 'premium') lead.push('✦ FEATURE COLLECTION ✦');
return assembleMenu(frame, {
title: heading,
lead,
sections: [
{ name: 'CATEGORY PROFILE', lines: profileLines},
{ name: listSection, lines: pluginLines}
],
footer: [detailed? 'Ketik *' + commandPrefix + 'menu* untuk kembali.': 'Ketik *' + commandPrefix + category.slug + '* untuk panduan lengkap.']
});
}

async function sendInteractiveList(ctx, { text, buttonText, sectionTitle, rows, fallback}) {
if (typeof ctx.sendMessage!== 'function' ||!rows.length || rows.length > 10) {
await ctx.reply(fallback);
return false;
}
try {
await ctx.sendMessage(ctx.chat, {
text,
footer: 'MUSE-MD',
buttons: [{
text: buttonText,
sections: [{ title: sectionTitle, rows}]
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
const prefix = typeof ctx.prefix === 'string'? ctx.prefix: Array.isArray(config.prefix)? (config.prefix[0] || '.'): String(config.prefix || '.');
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
'┌─ [ 👤 USER INFO]',
'│ ◈ Nama: ' + cleanLabel(ctx.pushname, 'Pengguna'),
'│ ◈ Status: ' + (ctx.isOwner? 'OWNER': ctx.isGroupAdmin? 'GROUP ADMIN': 'MEMBER'),
'│ ◈ Mode: ' + (config.publicMode? 'PUBLIC': 'SELF'),
'│ ◈ Prefix: ' + prefix,
'│ ◈ Versi: v' + cleanLabel(version),
'└──────────────',
'',
'┌─ [ SYSTEM INFO]',
'│ ◈ WIB: ' + system.wib,
'│ ◈ WITA: ' + system.wita,
'│ ◈ WIT: ' + system.wit,
'│ ◈ Tanggal: ' + system.date,
'│ ◈ Uptime: ' + system.uptime,
'│ ◈ OS: ' + system.os,
'│ ◈ RAM: ' + system.ram,
'│ ◈ Fitur: ' + system.featureCount + ' Command',
'└──────────────',
'',
'',
'MUSE-MD SYSTEM DASHBOARD',
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
const prefix = typeof ctx.prefix === 'string'? ctx.prefix: Array.isArray(config.prefix)? (config.prefix[0] || '.'): String(config.prefix || '.');
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
: (Array.isArray(config.prefix)? config.prefix[0]: config.prefix) || '.';
const theme = preferences.categoryTheme;

const sections = categories.map(category => {
const commands = [...category.plugins]
.sort((a, b) => a.name.localeCompare(b.name, 'id'))
.flatMap(plugin => {
const available = (plugin.commands || []).filter(Boolean);
return available.length? available: [plugin.name];
});
const uniqueCommands = [...new Set(commands)];
const header = cleanLabel(category.label).toLocaleUpperCase('id-ID') + ' · ' + uniqueCommands.length;
if (theme === 'terminal') {
return ['┌─〔 ' + header + ' 〕',...uniqueCommands.map(command => '┃ ' + prefix + command), '└' + '─'.repeat(24)].join('\n');
}
if (theme === 'minimal' || theme === 'editorial') {
return [header,...uniqueCommands.map(command => ' ' + prefix + command), '─'.repeat(24)].join('\n');
}
if (theme === 'premium') {
return ['╔═〔 ' + header + ' 〕',...uniqueCommands.map(command => '║ ' + prefix + command), '╚' + '═'.repeat(24)].join('\n');
}
return ['╭─〔 ' + header + ' 〕',...uniqueCommands.map(command => '│ ' + prefix + command), '╰' + '─'.repeat(24)].join('\n');
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
return registry.list({ includeDisabled: true}).some(plugin => normalizeCategory(plugin.category) === command);
},
async execute(ctx) {
const categoryAlias = !['menu', 'help', 'catmenu'].includes(ctx.command);
if (categoryAlias) {
await ctx.reply(renderCategory(ctx, { detailed: true, categoryAlias: true}));
} else {
const output = ctx.command === 'catmenu'
? renderCategory(ctx, { detailed: false})
: ctx.command === 'help' && (ctx.args || []).length
? (renderPluginHelp(ctx, ctx.args[0]) || 'Fitur tidak ditemukan atau tidak tersedia untuk akun ini.')
: renderMenu(ctx);
await ctx.reply(output);
}
return { handled: true, command: ctx.command};
},
renderMenu, renderCategory, renderAllMenu, renderPluginHelp, getCategories, getNextTheme, setTheme, themes: MENU_THEMES, themeVersions: MENU_THEME_VERSIONS, preferences
});
}

module.exports = { createMenuService, normalizeCategory, formatUptime, MENU_THEMES, CATEGORY_LAYOUTS};
