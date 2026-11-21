'use strict';

const axios = require('axios');
const FormData = require('form-data');
const { getPluginProgress } = require('../../src/core/services/plugin-progress.service');

const COMMANDS = [
  'tobotak', 'tochibi', 'tofunk', 'tofigura', 'tofigurav2', 'tofigurav3',
  'toghibli', 'tohijab', 'tojapanese', 'tojepang', 'tokacamata', 'tokamboja',
  'tolego', 'toliquor', 'tomaid', 'tomirror', 'tomoai', 'tomonyet',
  'topacar', 'topeci', 'topiramida', 'toputih', 'toreal', 'toroblox',
  'toroh', 'totato', 'totua', 'toviking', 'tozombie', 'tounderground',
  'tohitam'
];
const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 15 * 1024 * 1024;
const USER_AGENT = 'BASEBOT/2.0 (image-transform)';

function detectImageFormat(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buffer.toString('ascii', 0, 6) === 'GIF87a' || buffer.toString('ascii', 0, 6) === 'GIF89a') return 'gif';
  return null;
}

async function uploadImage(buffer) {
  const form = new FormData();
  form.append('files[]', buffer, { filename: 'basebot-input.jpg', contentType: 'application/octet-stream' });
  const response = await axios.post('https://uguu.se/upload', form, {
    headers: { ...form.getHeaders(), 'User-Agent': USER_AGENT },
    timeout: 30000,
    maxContentLength: 1024 * 1024,
    maxBodyLength: MAX_INPUT_BYTES + 1024 * 1024,
    maxRedirects: 0,
    validateStatus: status => status >= 200 && status < 300
  });
  const value = response.data?.files?.[0]?.url;
  if (typeof value !== 'string') throw new Error('Layanan upload tidak memberikan URL gambar.');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'uguu.se' || url.username || url.password) {
    throw new Error('Layanan upload memberikan alamat yang tidak valid.');
  }
  return url.toString();
}

async function convertImage(command, imageUrl) {
  const endpoint = 'https://api-faa.my.id/faa/' + encodeURIComponent(command) + '?url=' + encodeURIComponent(imageUrl);
  const response = await axios.get(endpoint, {
    responseType: 'arraybuffer',
    timeout: 60000,
    maxContentLength: MAX_OUTPUT_BYTES,
    maxBodyLength: MAX_OUTPUT_BYTES,
    maxRedirects: 0,
    headers: { 'User-Agent': USER_AGENT, Accept: 'image/png,image/jpeg,image/webp' },
    validateStatus: status => status >= 200 && status < 300
  });
  const buffer = Buffer.from(response.data || []);
  if (!detectImageFormat(buffer)) throw new Error('Provider mengembalikan file yang bukan gambar valid.');
  if (buffer.length > MAX_OUTPUT_BYTES) throw new Error('Ukuran hasil melebihi batas 15 MB.');
  return buffer;
}

module.exports = {
  name: 'ai-image-transform',
  commands: COMMANDS,
  category: 'image',
  description: 'Mengubah gaya gambar dengan koleksi AI image transform PatrickMD.',
  usage: '.tochibi (balas gambar) | .toghibli | .toreal | .tolego',
  permissions: {},
  async execute(ctx) {
    const progress = getPluginProgress(ctx);
    if (!COMMANDS.includes(ctx.command)) return ctx.reply('Mode transformasi tidak dikenal.');
    if (!ctx.quoted || !/^image\//i.test(String(ctx.mime || ''))) {
      return ctx.reply('Balas satu gambar dengan command transformasi. Contoh: ' + ctx.prefix + ctx.command);
    }

    await progress.start('Menyiapkan gambar', {
      detail: 'Memeriksa gambar sumber. Gambar akan diunggah ke layanan pihak ketiga untuk diproses.'
    });
    try {
      const input = await ctx.quoted.download();
      if (!Buffer.isBuffer(input) || input.length === 0 || input.length > MAX_INPUT_BYTES) {
        throw new Error('Gambar kosong atau melebihi batas 8 MB.');
      }
      if (!detectImageFormat(input)) throw new Error('Format gambar tidak valid. Gunakan JPEG, PNG, WebP, atau GIF.');
      await progress.update('Mengunggah gambar sumber', {
        detail: 'Mengunggah sementara ke layanan pemrosesan gambar.'
      });
      const imageUrl = await uploadImage(input);
      await progress.update('Memproses efek ' + ctx.command, {
        detail: 'Menunggu hasil dari provider AI image transform.'
      });
      const output = await convertImage(ctx.command, imageUrl);
      await progress.update('Mengirim hasil transformasi', {
        detail: 'Hasil gambar sudah divalidasi dan siap dikirim.'
      });
      await ctx.sendMessage(ctx.chat, {
        image: output,
        caption: 'Hasil transformasi: ' + ctx.command
      }, { quoted: ctx.m.raw });
    } catch (error) {
      await progress.fail('Transformasi gambar gagal', {
        detail: 'Provider tidak tersedia atau hasilnya tidak valid.'
      });
      ctx.logger?.warn?.('AI image transform gagal.', {
        command: ctx.command,
        error: error?.message || 'Unknown error'
      });
      await ctx.reply('Gagal memproses gambar: ' + String(error?.message || 'provider tidak tersedia').slice(0, 220));
    }
  }
};

module.exports.detectImageFormat = detectImageFormat;
module.exports.uploadImage = uploadImage;
module.exports.convertImage = convertImage;
module.exports.COMMANDS = COMMANDS;
