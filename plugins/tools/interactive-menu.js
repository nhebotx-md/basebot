'use strict';

const { validatePermission } = require('../../src/core/security/permission-manager');

const MAX_CATEGORIES = 10;

function cleanText(value, fallback, limit) {
  const text = String(value || fallback)
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return Array.from(text || fallback).slice(0, limit).join('');
}

function categorySlug(value) {
  return String(value || '').trim().toLocaleLowerCase('id-ID').replace(/\s+/g, '-');
}

function getPrefix(ctx) {
  if (typeof ctx.prefix === 'string' && ctx.prefix) return ctx.prefix;
  if (Array.isArray(ctx.config?.prefix)) return ctx.config.prefix[0] || '.';
  return String(ctx.config?.prefix || '.');
}

function getCategories(ctx) {
  const plugins = ctx.registry.list({ includeDisabled: false });
  const categories = new Map();

  for (const plugin of plugins) {
    if (!validatePermission(plugin, ctx).allowed) continue;
    const slug = categorySlug(plugin.category);
    // Keep row IDs as a single parser argument and avoid unsafe/control characters.
    if (!slug || slug.length > 60 || /[\s\u0000-\u001f\u007f-\u009f]/u.test(slug)) continue;
    if (!categories.has(slug)) {
      categories.set(slug, cleanText(plugin.category, 'Lainnya', 60));
    }
  }

  return [...categories.entries()]
    .map(([slug, label]) => ({ slug, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'id'))
    .slice(0, MAX_CATEGORIES);
}

function fallbackText(categories, prefix) {
  if (!categories.length) return 'Belum ada kategori fitur yang tersedia untuk akun ini.';
  return [
    'Pilih kategori fitur:',
    ...categories.map(category => `• ${category.label}: ${prefix}catmenu ${category.slug}`)
  ].join('\n');
}

async function sendFallback(ctx, text) {
  const options = { quoted: ctx.m?.raw };
  try {
    if (typeof ctx.sendMessage === 'function') {
      await ctx.sendMessage(ctx.chat, { text }, options);
      return;
    }
  } catch {
    // Keep the fallback silent; the interactive-send error is intentionally hidden.
  }
  try {
    await ctx.reply(text, options);
  } catch {
    // The chat may no longer be available; do not expose transport details.
  }
}

module.exports = {
  name: 'interactive-menu',
  commands: ['menui'],
  category: 'tools',
  description: 'Menampilkan daftar kategori fitur dalam menu interaktif.',
  usage: '.menui',
  permissions: { privateOnly: true },
  async execute(ctx) {
    const prefix = getPrefix(ctx);
    const categories = getCategories(ctx);
    const text = fallbackText(categories, prefix);
    const quoted = ctx.m?.raw;

    if (!categories.length || typeof ctx.sendMessage !== 'function') {
      await sendFallback(ctx, text);
      return;
    }

    const rows = categories.slice(0, MAX_CATEGORIES).map(category => ({
      title: cleanText(category.label, 'Kategori', 24),
      description: cleanText(`Buka kategori ${category.label}`, 'Buka kategori fitur', 72),
      id: `${prefix}catmenu ${category.slug}`
    }));
    const message = {
      text: `Pilih kategori lewat tombol interaktif. Jika tombol tidak tampil, gunakan command berikut:\n${categories.map(category => `• ${prefix}catmenu ${category.slug}`).join('\n')}`,
      footer: 'MUSE-MD',
      buttons: [{ text: 'Pilih kategori', sections: [{ title: 'Kategori', rows }] }]
    };

    try {
      await ctx.sendMessage(ctx.chat, message, { quoted });
    } catch {
      await sendFallback(ctx, text);
    }
  }
};
