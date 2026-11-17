'use strict';

function quotedKey(ctx) {
  const key = ctx.quoted?.key;
  return key && typeof key === 'object' && key.id && key.remoteJid ? key : null;
}

function ownQuotedMessage(ctx, key) {
  // Missing ownership metadata is deliberately treated as not-from-bot.
  return Boolean(key && key.fromMe === true);
}

module.exports = {
  name: 'message-actions',
  commands: ['react', 'pin', 'unpin', 'edit', 'del'],
  category: 'message',
  description: 'Mengelola reaksi, pin, edit, dan penghapusan pesan yang dibalas.',
  usage: '.react <emoji|hapus> / .pin [24h|7d|30d] / .unpin / .edit <teks> / .del',
  permissions: {},

  async execute(ctx) {
    const command = String(ctx.command || '').toLowerCase();
    const text = String(ctx.text || '').trim();
    const key = quotedKey(ctx);

    if (command === 'react') {
      if (!key) return ctx.reply('Balas pesan yang ingin diberi reaksi.');
      if (!text) return ctx.reply(`Gunakan ${ctx.prefix}react <emoji> atau ${ctx.prefix}react hapus.`);
      const emoji = /^hapus$/i.test(text) ? '' : text;
      if ([...emoji].length > 32 || /[\r\n]/.test(emoji)) return ctx.reply('Emoji reaksi tidak valid.');
      await ctx.client.sendMessage(ctx.chat, { react: { text: emoji, key } });
      return;
    }

    if (command === 'pin' || command === 'unpin') {
      if (!key) return ctx.reply('Balas pesan yang ingin dipin atau dilepas pin-nya.');
      if (command === 'unpin') {
        if (text) return ctx.reply(`Gunakan ${ctx.prefix}unpin tanpa argumen.`);
        await ctx.sendMessage(ctx.chat, { pin: key, type: 2 }, { quoted: null });
        return;
      }
      const durations = { '24h': 86400, '7d': 604800, '30d': 2592000 };
      if (text && !Object.hasOwn(durations, text.toLowerCase())) {
        return ctx.reply(`Durasi pin harus 24h, 7d, atau 30d. Contoh: ${ctx.prefix}pin 7d`);
      }
      const time = durations[text.toLowerCase()] || durations['24h'];
      await ctx.sendMessage(ctx.chat, { pin: key, time, type: 1 }, { quoted: null });
      return;
    }

    if (command === 'edit') {
      if (!key) return ctx.reply('Balas pesan bot sendiri yang ingin diedit.');
      if (!ownQuotedMessage(ctx, key)) return ctx.reply('Edit hanya diizinkan untuk pesan bot sendiri.');
      if (!text) return ctx.reply(`Gunakan ${ctx.prefix}edit <teks baru>.`);
      if (text.length > 4000) return ctx.reply('Teks edit maksimal 4.000 karakter.');
      await ctx.client.sendMessage(ctx.chat, { text, edit: key });
      return;
    }

    if (command === 'del') {
      if (!key) return ctx.reply('Balas pesan yang ingin dihapus.');
      if (text) return ctx.reply(`Gunakan ${ctx.prefix}del tanpa argumen.`);
      const allowed = ownQuotedMessage(ctx, key) || (ctx.isGroup === true && ctx.isGroupAdmin === true);
      if (!allowed) return ctx.reply('Hapus hanya diizinkan untuk pesan bot sendiri atau oleh admin grup.');
      await ctx.client.sendMessage(ctx.chat, { delete: key });
    }
  }
};
