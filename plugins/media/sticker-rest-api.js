'use strict';

const { getPluginProgress } = require('../../src/core/services/plugin-progress.service');

const MAX_MEDIA_BYTES = 8 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_TEXT_LENGTH = 300;
const API_URL = 'https://api.siputzx.my.id/api/m/brat';

function detectMedia(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null;
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))) return 'gif';
  return null;
}

function resolveMode(command, args) {
  const name = String(command || '').toLowerCase();
  if (name === 'brat') return { mode: 'brat', words: args };
  if (['bratvid', 'bratvideo'].includes(name)) return { mode: 'animated', words: args };
  const [input, ...words] = args;
  const mode = String(input || '').toLowerCase();
  return { mode, words };
}

async function fetchGeneratedMedia(ctx, mode, text) {
  const animated = mode === 'animated';
  const url = API_URL + '?text=' + encodeURIComponent(text) + '&isAnimated=' + String(animated) + (animated ? '&delay=500' : '');
  const result = await ctx.services.media.downloadBuffer(url, {
    maxBytes: MAX_MEDIA_BYTES,
    timeoutMs: REQUEST_TIMEOUT_MS
  });
  const expected = animated ? 'gif' : 'png';
  const actual = detectMedia(result.buffer);
  if (actual !== expected) throw new Error('Provider mengembalikan format media yang tidak sesuai.');
  return { buffer: result.buffer, provider: 'Siputzx API' };
}

module.exports = {
  name: 'sticker-api',
  commands: ['brat', 'bratvid', 'bratvideo', 'stickerapi', 'stapi'],
  category: 'media',
  description: 'Membuat sticker Brat statis dan animasi melalui satu REST API.',
  usage: '.brat <teks> atau .bratvid <teks>',
  permissions: {},
  async execute(ctx) {
    const progress = getPluginProgress(ctx);
    const { mode, words } = resolveMode(ctx.command, ctx.args || []);
    const text = words.join(' ').trim();

    if (!text || ['help', 'brat', 'animated'].includes(mode) && !text) {
      return ctx.reply([
        'Sticker Brat',
        ctx.prefix + 'brat <teks> — sticker statis',
        ctx.prefix + 'bratvid <teks> — sticker animasi',
        ctx.prefix + 'stickerapi <brat|animated> <teks> — format alternatif',
        'Teks maksimal ' + MAX_TEXT_LENGTH + ' karakter.'
      ].join('\n'));
    }
    if (!['brat', 'animated'].includes(mode)) {
      return ctx.reply('Mode tidak dikenal. Gunakan .brat, .bratvid, atau .stickerapi brat|animated.');
    }
    if (text.length > MAX_TEXT_LENGTH) return ctx.reply('Teks maksimal ' + MAX_TEXT_LENGTH + ' karakter.');

    await progress.start('Menyiapkan sticker ' + (mode === 'animated' ? 'animasi' : 'Brat'), {
      detail: 'Memvalidasi teks dan menyiapkan permintaan ke Siputzx API.'
    });
    try {
      await progress.update('Mengambil media dari Siputzx API', {
        detail: 'Meminta hasil ' + (mode === 'animated' ? 'GIF animasi' : 'PNG statis') + '.'
      });
      const media = await fetchGeneratedMedia(ctx, mode, text);
      await progress.update('Mengonversi media menjadi sticker WhatsApp', {
        detail: 'Format hasil sudah divalidasi. Menyiapkan metadata sticker.'
      });
      const options = { packname: ctx.config.sticker.packname, author: ctx.config.sticker.author };
      if (mode === 'animated') await ctx.client.sendVideoAsSticker(ctx.chat, media.buffer, ctx.m.raw, options);
      else await ctx.client.sendImageAsSticker(ctx.chat, media.buffer, ctx.m.raw, options);
      ctx.logger?.debug?.('Sticker berhasil dibuat.', { provider: media.provider, mode, mediaBytes: media.buffer.length });
    } catch {
      await progress.fail('Sticker gagal dibuat', {
        detail: 'Siputzx API tidak tersedia atau hasil media tidak lolos validasi.'
      });
      await ctx.reply('Sticker gagal dibuat. Siputzx API sedang tidak tersedia atau mengirim media yang tidak valid. Coba lagi nanti.');
    }
  }
};

module.exports.detectMedia = detectMedia;
module.exports.fetchGeneratedMedia = fetchGeneratedMedia;
module.exports.resolveMode = resolveMode;
