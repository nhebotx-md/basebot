'use strict';

const MAX_MEDIA_BYTES = 8 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_TEXT_LENGTH = 300;
const PROVIDERS = {
  brat: [
    {
      name: 'Siputzx API',
      url: text => `https://api.siputzx.my.id/api/m/brat?text=${encodeURIComponent(text)}&isAnimated=false`,
      expected: 'png'
    }
  ],
  animated: [
    {
      name: 'Siputzx API',
      url: text => `https://api.siputzx.my.id/api/m/brat?text=${encodeURIComponent(text)}&isAnimated=true&delay=500`,
      expected: 'gif'
    }
  ]
};
const OPTIONAL_PROVIDERS = {
  brat: { name: 'Asepharyana Brat (alternate host)', url: text => `https://scraper.asepharyana.my.id/image/brat?text=${encodeURIComponent(text)}`, expected: 'png' },
  animated: { name: 'Asepharyana Brat (alternate host)', url: text => `https://scraper.asepharyana.my.id/image/brat/animated?text=${encodeURIComponent(text)}`, expected: 'gif' }
};

function detectMedia(buffer, contentType = '') {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null;
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.length >= 6 && (buffer.toString('ascii', 0, 6) === 'GIF87a' || buffer.toString('ascii', 0, 6) === 'GIF89a')) return 'gif';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return buffer.includes(Buffer.from('ANIM')) || buffer.includes(Buffer.from('ANMF')) ? 'gif' : 'webp';
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') return 'video';
  if (/image\/(?:png|x-png)/i.test(contentType)) return null;
  return null;
}

async function fetchGeneratedMedia(ctx, mode, text) {
  let lastError;
  const providers = [...PROVIDERS[mode]];
  if (ctx.config?.sticker?.apis?.asepharyanaEnabled === true) providers.push(OPTIONAL_PROVIDERS[mode]);
  for (const provider of providers) {
    try {
      const result = await ctx.services.media.downloadBuffer(provider.url(text), {
        maxBytes: MAX_MEDIA_BYTES,
        timeoutMs: REQUEST_TIMEOUT_MS
      });
      const actual = detectMedia(result.buffer, result.contentType);
      if (actual !== provider.expected) throw new Error('Tipe media tidak cocok.');
      return { buffer: result.buffer, provider: provider.name };
    } catch (error) {
      lastError = error;
      ctx.logger?.warn?.('Penyedia REST sticker gagal.', { provider: provider.name });
    }
  }
  throw lastError || new Error('Semua penyedia REST sticker tidak tersedia.');
}

module.exports = {
  name: 'sticker-rest-api',
  commands: ['stickerapi', 'stapi'],
  category: 'media',
  description: 'Membuat sticker Brat dari REST API dengan validasi media dan fallback.',
  usage: '.stickerapi <brat|animated> <teks>',
  permissions: {},
  async execute(ctx) {
    const [modeInput, ...words] = ctx.args;
    const mode = String(modeInput || '').toLowerCase();
    const text = words.join(' ').trim();
    if (!mode || mode === 'help' || !text) {
      return ctx.reply([
        'Sticker REST API',
        `${ctx.prefix}stickerapi brat <teks> — sticker Brat statis`,
        `${ctx.prefix}stickerapi animated <teks> — sticker Brat animasi`,
        'Fallback host alternatif Asepharyana hanya aktif jika STICKER_API_ASEPHARYANA_ENABLED=true.',
        `Teks maksimal ${MAX_TEXT_LENGTH} karakter. Output divalidasi dan dikonversi ke sticker WhatsApp; fallback Asepharyana bersifat opt-in.`
      ].join('\n'));
    }
    if (!Object.hasOwn(PROVIDERS, mode)) return ctx.reply(`Mode tidak dikenal. Gunakan: ${ctx.prefix}stickerapi brat atau animated.`);
    if (text.length > MAX_TEXT_LENGTH) return ctx.reply(`Teks maksimal ${MAX_TEXT_LENGTH} karakter.`);

    try {
      const media = await fetchGeneratedMedia(ctx, mode, text);
      await ctx.react('⚡');
      const options = { packname: ctx.config.sticker.packname, author: ctx.config.sticker.author };
      if (mode === 'animated') await ctx.client.sendVideoAsSticker(ctx.chat, media.buffer, ctx.m.raw, options);
      else await ctx.client.sendImageAsSticker(ctx.chat, media.buffer, ctx.m.raw, options);
      ctx.logger?.debug?.('Sticker REST berhasil dibuat.', { provider: media.provider, mode, mediaBytes: media.buffer.length });
    } catch {
      await ctx.reply('Layanan sticker sedang tidak tersedia atau mengirim media yang tidak valid. Coba lagi nanti.');
    }
  }
};

module.exports.detectMedia = detectMedia;
module.exports.fetchGeneratedMedia = fetchGeneratedMedia;
module.exports.providers = PROVIDERS;
