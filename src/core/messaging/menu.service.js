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
  return [days ? \`\${days} hari\` : '', hours ? \`\${hours}j\` : '', minutes ? \`\${minutes}m\` : '', \`\${secs}dtk\`].filter(Boolean).join(' ');
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

function createMenuService({ registry, config, version = '0.0.0', startedAt = Date.now(), clock = () => new Date() }) {
  if (!registry || typeof registry.list !== 'function') throw new TypeError('MenuService membutuhkan PluginRegistry.');
  if (!config) throw new TypeError('MenuService membutuhkan konfigurasi.');

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

  function renderMenu(ctx) {
    const plugins = getVisiblePlugins(ctx);
    const categories = getCategories(ctx);
    const commandCount = plugins.reduce((total, plugin) => total + plugin.commands.length, 0);
    const now = clock();
    const { time, date } = dateParts(config.timezone, now);
    const role = ctx.isOwner ? '👑 Owner' : ctx.isGroupAdmin ? '🛡️ Admin' : 'Member';
    const userName = cleanLabel(ctx.pushname, 'Pengguna');
    const botName = cleanLabel(config.botName, 'BASEBOT');
    const ownerName = cleanLabel(config.ownerName, 'Owner');
    const mode = config.publicMode ? 'PUBLIC' : 'SELF';
    const commandPrefix = Array.isArray(config.prefix) ? (config.prefix[0] || '.') : String(config.prefix || '.');
    const prefixLabel = Array.isArray(config.prefix) ? config.prefix.join(' / ') : commandPrefix;
    const lines = [
      \`Hai *\${userName}* 🪸\`,
      '',
      \`Aku *\${botName}*, bot WhatsApp yang siap membantu aktivitasmu.\`,
      '',
      '╭─〔 🤖 *BOT INFO* 〕',
      \`*│* 🌙 Nama       : *\${botName}*\`,
      \`*│* 🔑 Versi      : *v\${cleanLabel(version)}*\`,
      \`*│* ⚙️ Mode       : *\${mode}*\`,
      \`*│* 🧶 Prefix     : *[ \${prefixLabel} ]*\`,
      \`*│* ⏱️ Uptime     : *\${formatUptime((now.getTime() - startedAt) / 1000)}*\`,
      \`*│* 🧩 Plugin     : *\${plugins.length} aktif*\`,
      \`*│* 🛠️ Command    : *\${commandCount} terdaftar*\`,
      \`*│* 👑 Owner      : *\${ownerName}*\`,
      '╰────────────────⎯',
      '',
      '╭─〔 👤 *USER INFO* 〕',
      \`*│* 🙋 Nama       : *\${userName}*\`,
      \`*│* 🎭 Role       : *\${role}*\`,
      \`*│* 🕒 Waktu      : *\${time} \${timeZoneLabel(config.timezone)}*\`,
      \`*│* 📅 Tanggal    : *\${date}*\`,
      '╰────────────────⎯',
      '',
      '📂 *DAFTAR MENU*'
    ];
    if (!categories.length) lines.push('- Belum ada plugin aktif yang dapat ditampilkan.');
    else for (const category of categories) {
      const icon = CATEGORY_ICONS[category.slug] || '📁';
      lines.push(\`- \\\`⎯\\\` \${commandPrefix}catmenu \${category.slug} \${icon}\`);
    }
    lines.push('', '_Statistik EXP, koin, HP, mana, dan stamina belum tersedia karena BASEBOT belum memiliki sistem profil pengguna._');
    return lines.join('\\n');
  }

  function renderCategory(ctx) {
    const commandPrefix = typeof ctx.prefix === 'string' ? ctx.prefix : Array.isArray(config.prefix) ? (config.prefix[0] || '.') : String(config.prefix || '.');
    const requested = normalizeCategory((ctx.args || []).join(' '));
    const categories = getCategories(ctx);
    if (!requested) {
      return [
        '📂 *DAFTAR KATEGORI MENU*',
        ...categories.map(category => \`- \${commandPrefix}catmenu \${category.slug} \${CATEGORY_ICONS[category.slug] || '📁'}\`),
        '',
        \`Gunakan *\${commandPrefix}catmenu <kategori>* untuk melihat command.\`
      ].join('\\n');
    }
    const category = categories.find(item => item.slug === requested);
    if (!category) {
      const available = categories.map(item => item.slug).join(', ') || 'belum ada';
      return \`Kategori *\${requested}* tidak ditemukan.\\nKategori tersedia: \${available}\\nKetik *\${commandPrefix}menu* untuk melihat daftar kategori.\`;
    }
    const lines = [
      \`╭─〔 \${CATEGORY_ICONS[category.slug] || '📁'} *MENU \${category.label.toLocaleUpperCase('id-ID')}* 〕\`,
      \`*│* Total plugin: *\${category.plugins.length}*\`,
      '╰────────────────⎯',
      ''
    ];
    for (const plugin of category.plugins.sort((a, b) => a.name.localeCompare(b.name, 'id'))) {
      const primary = plugin.commands[0];
      lines.push(\`➤ *\${commandPrefix}\${primary}*\`);
      if (plugin.commands.length > 1) lines.push(\`  Alias: \${plugin.commands.slice(1).map(command => \`\\\`\${commandPrefix}\${command}\\\`\`).join(', ')}\`);
      if (plugin.description) lines.push(\`  _\${cleanLabel(plugin.description, '')}_\`);
      if (plugin.usage && plugin.usage !== \`\${commandPrefix}\${primary}\`) lines.push(\`  Cara pakai: \${plugin.usage}\`);
      lines.push('');
    }
    lines.push(\`Ketik *\${commandPrefix}menu* untuk kembali ke daftar kategori.\`);
    return lines.join('\\n').trim();
  }

  return Object.freeze({
    canHandle(command) { return command === 'menu' || command === 'catmenu'; },
    async execute(ctx) {
      const output = ctx.command === 'menu' ? renderMenu(ctx) : renderCategory(ctx);
      await ctx.reply(output);
      return { handled: true, command: ctx.command };
    },
    renderMenu,
    renderCategory
  });
}

module.exports = { createMenuService, normalizeCategory, formatUptime };
