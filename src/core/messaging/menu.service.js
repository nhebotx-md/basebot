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
  const primary = (plugin.commands || [])[0] || plugin.name;
  return ['│ ' + String(index + 1).padStart(2, '0') + '  ' + bullet + ' *' + prefix + primary + '*'];
}

function renderCategoryLayout(category, prefix, theme = 'showcase') {
  const icon = CATEGORY_ICONS[category.slug] || '▣';
  const heading = icon + ' ' + categoryTitle(category);
  const plugins = [...category.plugins].sort((a, b) => a.name.localeCompare(b.name, 'id'));
  const entries = plugins.map((plugin, index) => ({ plugin, index, command: prefix + (plugin.commands[0] || plugin.name) }));
  if (theme === 'terminal') {
    return ['┌─ ' + heading, '├─ FEATURE DIRECTORY', ...entries.map(({ command }, index) => '│ [' + String(index + 1).padStart(2, '0') + '] ' + command), '└─ END'];
  }
  if (theme === 'minimal') return [heading, '', ...entries.map(({ command }) => command)];
  if (theme === 'premium') return ['╔══════════ ✦ ' + heading + ' ✦ ══════════╗', '╠════════════════ FEATURE LIST ═══════════════╣', ...entries.map(({ command }, index) => '║  ' + String(index + 1).padStart(2, '0') + '  ✧  *' + command + '*'), '╚══════════════════════════════════════════════╝'];
  if (theme === 'editorial') return ['THE FEATURE INDEX', 'CATEGORY / ' + category.label.toUpperCase(), '────────────────────────────────', ...entries.map(({ command }, index) => String(index + 1).padStart(2, '0') + '  /  ' + command), '────────────────────────────────'];
  const lines = frameLines(heading, 'showcase', 'PILIH FITUR');
  for (const { plugin, index } of entries) lines.push(...pluginLines(plugin, prefix, index, 'showcase'));
  if (!entries.length) lines.push('│ Tidak ada fitur aktif.');
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
    const categories = getCategories(ctx);
    const now = clock();
    const parts = dateParts(config.timezone, now);
    const role = ctx.isOwner ? 'OWNER' : ctx.isGroupAdmin ? 'GROUP ADMIN' : ({ user: 'USER', premium: 'PREMIUM', moderator: 'MODERATOR', guest: 'GUEST' }[ctx.userRole] || 'MEMBER');
    const userName = cleanLabel(ctx.pushname, 'Pengguna');
    const botName = cleanLabel(config.botName, 'BASEBOT');
    const mode = config.publicMode ? 'PUBLIC' : 'SELF';
    const commandPrefix = Array.isArray(config.prefix) ? (config.prefix[0] || '.') : String(config.prefix || '.');
    const prefixLabel = Array.isArray(config.prefix) ? config.prefix.join(' / ') : commandPrefix;
    const uptime = formatUptime((now.getTime() - startedAt) / 1000);
    const rows = categories.map((category, index) => ({ category, index, icon: CATEGORY_ICONS[category.slug] || '▣' }));
    let lines;
    if (theme === 'terminal') {
      lines = ['┌─ BASEBOT SYSTEM DASHBOARD', '│ SESSION : ' + userName + ' [' + role + ']', '│ MODE    : ' + mode, '│ PREFIX  : ' + prefixLabel, '│ RUNTIME : v' + cleanLabel(version) + ' / ' + uptime, '├─ FEATURE DIRECTORY'];
      for (const row of rows) lines.push('│ [' + String(row.index + 1).padStart(2, '0') + '] ' + commandPrefix + 'catmenu ' + row.category.slug);
      lines.push('└─ ' + parts.date + ' ' + parts.time + ' ' + timeZoneLabel(config.timezone));
    } else if (theme === 'minimal') {
      lines = [botName + ' / FEATURE MENU', userName + ' · ' + role, 'v' + cleanLabel(version) + ' · ' + mode + ' · ' + uptime, '', ...rows.map(row => row.icon + '  ' + commandPrefix + 'catmenu ' + row.category.slug), '', parts.date + ' · ' + parts.time + ' ' + timeZoneLabel(config.timezone)];
    } else if (theme === 'premium') {
      lines = ['╔══════════════ ✦ ' + botName + ' ✦ ══════════════╗', '║  FEATURE COLLECTION', '║  MEMBER   ' + userName + ' (' + role + ')', '║  STATUS   ' + mode + '  •  ' + uptime, '║  PREFIX   ' + prefixLabel, '╠══════════════ FEATURE DIRECTORY ════════════╣'];
      for (const row of rows) lines.push('║  ' + row.icon + '  *' + commandPrefix + 'catmenu ' + row.category.slug + '*');
      lines.push('╚══════════════════════════════════════════════╝', parts.date + '  •  ' + parts.time + ' ' + timeZoneLabel(config.timezone));
    } else if (theme === 'editorial') {
      lines = ['THE BASEBOT JOURNAL', 'FEATURE DIRECTORY', '────────────────────────────────────────', botName + '  |  v' + cleanLabel(version), userName + ' / ' + role + ' / ' + mode, 'Runtime ' + uptime + ' · Prefix ' + prefixLabel, '', 'CONTENTS'];
      for (const row of rows) lines.push(String(row.index + 1).padStart(2, '0') + '  /  ' + row.category.label.toUpperCase() + '  ·  ' + commandPrefix + 'catmenu ' + row.category.slug);
      lines.push('────────────────────────────────────────', parts.date + ' · ' + parts.time + ' ' + timeZoneLabel(config.timezone));
    } else {
      lines = frameLines('✦ ' + botName + ' / FEATURE MENU', 'showcase', 'PILIH KATEGORI FITUR');
      lines.push('│ USER   : *' + userName + '*', '│ ROLE   : *' + role + '*', '│ MODE   : *' + mode + '*', '│ PREFIX : *' + prefixLabel + '*', '│ VERSION: *v' + cleanLabel(version) + '*', '│ UPTIME : *' + uptime + '*', FRAME.showcase.mid, '│ FEATURE DIRECTORY');
      for (const row of rows) lines.push('│ ' + row.icon + '  *' + commandPrefix + 'catmenu ' + row.category.slug + '*');
      if (!rows.length) lines.push('│ Tidak ada kategori aktif.');
      lines.push(FRAME.showcase.bottom, parts.date + '  •  ' + parts.time + ' ' + timeZoneLabel(config.timezone));
    }
    lines.push('Ketik *' + commandPrefix + 'catmenu <kategori>* untuk membuka pilihan fitur.');
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
    const text = [
      '┌─ BASEBOT SYSTEM DASHBOARD',
      '│ SESSION : ' + cleanLabel(ctx.pushname, 'Pengguna'),
      '│ MODE    : ' + (config.publicMode ? 'PUBLIC' : 'SELF'),
      '│ PREFIX  : ' + prefix,
      '│ RUNTIME : v' + cleanLabel(version) ,
      '├─ FEATURE DIRECTORY',
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
