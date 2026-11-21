'use strict';

const axios = require('axios');
const { getPluginProgress } = require('../../src/core/services/plugin-progress.service');

const MAX_TEXT_LENGTH = 150;
const MAX_OUTPUT_BYTES = 15 * 1024 * 1024;

function isImageBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 1024) return false;
  return (
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
    (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
    (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') ||
    buffer.toString('ascii', 0, 6) === 'GIF87a' ||
    buffer.toString('ascii', 0, 6) === 'GIF89a'
  );
}

module.exports = {
  name: 'brat-foto',
  commands: ['bratfoto'],
  category: 'sticker',
  description: 'Membuat gambar Brat melalui provider alternatif PatrickMD.',
  usage: '.bratfoto <teks>',
  permissions: {},
  async execute(ctx) {
    const text = String(ctx.text || '').trim();
    if (!text) return ctx.reply('Contoh: ' + ctx.prefix + 'bratfoto halo dunia');
    if (text.length > MAX_TEXT_LENGTH) return ctx.reply('Teks maksimal ' + MAX_TEXT_LENGTH + ' karakter.');

    const progress = getPluginProgress(ctx);
    await progress.start('Membuat gambar Brat', {
      detail: 'Mengirim teks ke provider gambar pihak ketiga.'
    });
    try {
      await progress.update('Mengambil hasil gambar', {
        detail: 'Menunggu hasil PNG/JPEG/WebP dari provider.'
      });
      const response = await axios.get('https://aqul-brat.hf.space/api/brat', {
        params: { text },
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: MAX_OUTPUT_BYTES,
        maxBodyLength: MAX_OUTPUT_BYTES,
        maxRedirects: 0,
        headers: { 'User-Agent': 'BASEBOT/2.0', Accept: 'image/*' },
        validateStatus: status => status >= 200 && status < 300
      });
      const buffer = Buffer.from(response.data || []);
      if (!isImageBuffer(buffer) || buffer.length > MAX_OUTPUT_BYTES) {
        throw new Error('Provider tidak mengirim gambar valid atau ukuran hasil terlalu besar.');
      }
      await progress.update('Mengirim gambar Brat', {
        detail: 'Hasil sudah divalidasi dan siap dikirim.'
      });
      await ctx.sendMessage(ctx.chat, { image: buffer, caption: 'Brat: ' + text }, { quoted: ctx.m.raw });
    } catch (error) {
      await progress.fail('Gambar Brat gagal dibuat', { detail: 'Provider tidak tersedia atau respons tidak valid.' });
      ctx.logger?.warn?.('Bratfoto gagal diproses.', { error: error?.message || 'Unknown error' });
      await ctx.reply('Gagal membuat Bratfoto: ' + String(error?.message || 'provider tidak tersedia').slice(0, 180));
    }
  }
};

module.exports.isImageBuffer = isImageBuffer;
module.exports.MAX_TEXT_LENGTH = MAX_TEXT_LENGTH;
