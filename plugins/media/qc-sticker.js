'use strict';

const API_URL = 'https://brat.siputzx.my.id/quoted';
const MAX_TEXT_LENGTH = 80;
const MAX_AVATAR_BYTES = 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const COLORS = Object.freeze({
  pink: '#f68ac9', blue: '#6cace4', red: '#f44336', green: '#4caf50', yellow: '#ffeb3b',
  purple: '#9c27b0', darkblue: '#0d47a1', lightblue: '#03a9f4', ash: '#9e9e9e',
  orange: '#ff9800', black: '#000000', white: '#ffffff', teal: '#008080', lightpink: '#ffc0cb',
  chocolate: '#a52a2a', salmon: '#ffa07a', magenta: '#ff00ff', tan: '#d2b48c', wheat: '#f5deb3',
  deeppink: '#ff1493', fire: '#b22222', skyblue: '#00bfff', brightskyblue: '#1e90ff',
  hotpink: '#ff69b4', lightskyblue: '#87ceeb', seagreen: '#20b2aa', darkred: '#8b0000',
  orangered: '#ff4500', cyan: '#48d1cc', violet: '#ba55d3', mossgreen: '#00ff7f',
  darkgreen: '#008000', navyblue: '#191970', darkorange: '#ff8c00', darkpurple: '#9400d3',
  fuchsia: '#ff00ff', darkmagenta: '#8b008b', darkgray: '#2f4f4f', peachpuff: '#ffdab9',
  darkishgreen: '#bdb76b', darkishred: '#dc143c', goldenrod: '#daa520', darkishgray: '#696969',
  darkishpurple: '#483d8b', gold: '#ffd700', silver: '#c0c0c0'
});

function resolveColor(input) {
  const value = String(input || '').trim().toLowerCase();
  if (Object.hasOwn(COLORS, value)) return COLORS[value];
  return /^#[\da-f]{6}$/i.test(value) ? value : null;
}

function detectAvatarMime(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return 'image/png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

function quotedText(quoted) {
  if (typeof quoted?.text === 'string' && quoted.text) return quoted.text;
  const content = quoted?.msg;
  if (typeof content === 'string') return content;
  return String(content?.text || content?.caption || content?.conversation || content?.extendedTextMessage?.text || '');
}

async function getAvatarDataUrl(ctx) {
  try {
    const url = await ctx.client.profilePictureUrl(ctx.sender, 'image');
    const result = await ctx.services.media.downloadBuffer(url, { maxBytes: MAX_AVATAR_BYTES, timeoutMs: 10000 });
    const mime = detectAvatarMime(result.buffer);
    if (!mime || result.buffer.length > MAX_AVATAR_BYTES) return '';
    return `data:${mime};base64,${result.buffer.toString('base64')}`;
  } catch {
    return '';
  }
}

function helpText(prefix) {
  return [
    `💬 Quote Sticker warna custom`,
    `Gunakan: ${prefix}qc <warna|#hex> <teks>`,
    `Atau balas pesan dengan: ${prefix}qc <warna|#hex>`,
    `Contoh: ${prefix}qc pink Hai semuanya!`,
    `Warna: ${Object.keys(COLORS).join(', ')}`
  ].join('\n');
}

module.exports = {
  name: 'qc-sticker',
  commands: ['qc', 'qcstc', 'stcqc', 'qcstic', 'qcstick', 'quotesticker'],
  category: 'media',
  description: 'Membuat sticker quote dengan warna latar custom.',
  usage: '.qc <warna|#hex> <teks> atau balas pesan dengan .qc <warna|#hex>',
  permissions: {},
  async execute(ctx) {
    const [colorInput, ...words] = ctx.args || [];
    if (!colorInput) return ctx.reply(helpText(ctx.prefix));
    const backgroundColor = resolveColor(colorInput);
    if (!backgroundColor) return ctx.reply(`Warna “${String(colorInput).slice(0, 30)}” tidak tersedia. Gunakan nama warna dari bantuan atau format #RRGGBB.`);

    const message = words.join(' ').trim() || quotedText(ctx.quoted).trim();
    if (!message) return ctx.reply(`Masukkan teks atau balas pesan. Contoh: ${ctx.prefix}qc pink Hai semuanya!`);
    if (message.length > MAX_TEXT_LENGTH) return ctx.reply(`Teks quote maksimal ${MAX_TEXT_LENGTH} karakter (saat ini ${message.length}).`);

    await ctx.react('🕕');
    try {
      const username = String(ctx.pushname || 'User').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80) || 'User';
      const avatar = await getAvatarDataUrl(ctx);
      const payload = {
        messages: [{
          from: { id: 1, first_name: username, last_name: '', name: '', photo: { url: avatar } },
          text: message,
          entities: [],
          avatar: Boolean(avatar),
          media: { url: '' },
          mediaType: '',
          replyMessage: { name: '', text: '', entities: [], chatId: 1 }
        }],
        backgroundColor,
        width: 512,
        height: 512,
        scale: 2,
        type: 'quote',
        format: 'png',
        emojiStyle: 'apple'
      };
      const response = await ctx.services.http.postJsonPublic(API_URL, payload, {
        timeoutMs: 30000,
        maxBytes: MAX_IMAGE_BYTES,
        maxRequestBytes: 2 * 1024 * 1024
      });
      if (!response.ok) throw new Error(`Quote API HTTP ${response.status}.`);
      if (!Buffer.isBuffer(response.buffer) || response.buffer.length < PNG_SIGNATURE.length || response.buffer.length > MAX_IMAGE_BYTES || !response.buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
        throw new Error('Quote API mengembalikan PNG yang tidak valid.');
      }
      await ctx.client.sendImageAsSticker(ctx.chat, response.buffer, ctx.m.raw, {
        packname: ctx.config.sticker.packname,
        author: ctx.config.sticker.author
      });
      await ctx.react('✅');
    } catch {
      await ctx.react('❌');
      await ctx.reply('Quote sticker gagal dibuat. API mungkin sedang tidak tersedia atau mengembalikan gambar yang tidak valid.');
    }
  }
};

module.exports.resolveColor = resolveColor;
module.exports.detectAvatarMime = detectAvatarMime;
module.exports.colors = COLORS;
