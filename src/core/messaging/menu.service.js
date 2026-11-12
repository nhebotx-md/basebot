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
  return [days ? `${days}h` : '', hours ? `${hours}j` : '', minutes ? `${minutes}m` : '', `${secs}dtk`].filter(Boolean).join(' ');
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
    const { time, date } = dateParts(config.timezone, clock());
    const role = ctx.isOwner ? '👑 Owner' : ctx.isGroupAdmin ? '🛡️ Admin' : 'Member';
    const userName = cleanLabel(ctx.pushname, 'Pengguna');
    const botName = cleanLabel(config.botName, 'BASEBOT');
    const ownerName = cleanLabel(config.ownerName, 'Owner');
    const mode = config.publicMode ? 'PUBLIC' : 'SELF';
    const prefix = Array.isArray(config.prefix) ? config.prefix.join(' / ') : String(config.prefix || '.');
    const lines = [
      `Hai *${userName}* 🪸`,
      '',
      `Aku *${botName}*, bot WhatsApp yang siap membantu aktivitasmu.`,
      '',
      '╭─〔 🤖 *BOT INFO* 〕',
      `*│* 🌙 Nama       : *${botName}*`,
      `*│* 🔑 Versi      : *v${cleanLabel(version)}*`,
      `*│* ⚙️ Mode       : *${mode}*`,
      `*│* 🧶 Prefix     : *[ ${prefix} ]*`,
      `*│* ⏱️ Uptime     : *${formatUptime((clock().getTime() - startedAt) / 1000)}*`,
      `*│* 🧩 Plugin     : *${plugins.length} aktif*`,
      `*│* 🛠️ Command    : *${commandCount} terdaftar*`,
      `*│* 👑 Owner      : *${ownerName}*`,
      '╰────────────────⎯',
      '',
      '╭─〔 👤 *USER INFO* 〕',
      `*│* 🙋 Nama       : *${userName}*`,
      `*│* 🎭 Role       : *${role}*`,
      `*│* 🕒 Waktu      : *${time} WIB*`,
      `*│* 📅 Tanggal    : *${date}*`,
      '╰────────────────⎯',
      '',
      '📂 *DAFTAR MENU*'
    ];
    if (!categories.length) lines.push('- Belum ada plugin aktif yang dapat ditampilkan.');
    else for (const category of categories) {
      const icon = CATEGORY_ICONS[category.slug] || '📁';
      lines.push(`- \`⎯\` ${prefix}catmenu ${category.slug} ${icon}`);
    }
    lines.push('', '_Statistik EXP, koin, HP, mana, dan stamina belum tersedia karena BASEBOT belum memiliki sistem profil pengguna._');
    return lines.join('\n');
  }

  function renderCategory(ctx) {
    const requested = normalizeCategory((ctx.args || []).join(' '));
    const categories = getCategories(ctx);
    if (!requested) {
      return [
        '📂 *DAFTAR KATEGORI MENU*',
        ...categories.map(category => `- ${config.prefix}catmenu ${category.slug} ${CATEGORY_ICONS[category.slug] || '📁'}`),
        '',
        `Gunakan *${config.prefix}catmenu <kategori>* untuk melihat command.`
      ].join('\n');
    }
    const category = categories.find(item => item.slug === requested);
    if (!category) {
      const available = categories.map(item => item.slug).join(', ') || 'belum ada';
      return `Kategori *${requested}* tidak ditemukan.\nKategori tersedia: ${available}\nKetik *${config.prefix}menu* untuk melihat daftar kategori.`;
    }
    const lines = [
      `╭─〔 ${CATEGORY_ICONS[category.slug] || '📁'} *MENU ${category.label.toLocaleUpperCase('id-ID')}* 〕`,
      `*│* Total plugin: *${category.plugins.length}*`,
      '╰────────────────⎯',
      ''
    ];
    for (const plugin of category.plugins.sort((a, b) => a.name.localeCompare(b.name, 'id'))) {
      const primary = plugin.commands[0];
      lines.push(`➤ *${config.prefix}${primary}*`);
      if (plugin.commands.length > 1) lines.push(`  Alias: ${plugin.commands.slice(1).map(command => `\`${config.prefix}${command}\``).join(', ')}`);
      if (plugin.description) lines.push(`  _${cleanLabel(plugin.description, '')}_`);
      if (plugin.usage && plugin.usage !== `${config.prefix}${primary}`) lines.push(`  Cara pakai: ${plugin.usage}`);
      lines.push('');
    }
    lines.push(`Ketik *${config.prefix}menu* untuk kembali ke daftar kategori.`);
    return lines.join('\n').trim();
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
