'use strict';
const axios = require('axios');
const { assertPublicHttpUrl } = require('../../src/core/security/safe-url');
module.exports = {
  name: 'tiktok', commands: ['tiktok'], category: 'downloader',
  description: 'Mengunduh video atau gambar dari TikTok.', usage: '.tiktok <tautan TikTok>', permissions: {},
  async execute(ctx) {
    if (!ctx.text) return ctx.reply(`Contoh: ${ctx.prefix}tiktok https://vt.tiktok.com/...`);
    let source;
    try { source = new URL(ctx.text); } catch { return ctx.reply('Tautan tidak valid.'); }
    if (source.protocol !== 'https:' || !/(^|\.)tiktok\.com$/i.test(source.hostname)) return ctx.reply('Masukkan tautan HTTPS TikTok yang valid.');
    const response = await axios.get('https://www.laurine.site/api/downloader/tiktok', { params: { url: source.href }, timeout: 15000, maxRedirects: 0, maxContentLength: 1024 * 1024 });
    const data = response.data?.data;
    if (!response.data?.status || !data) return ctx.reply('Konten tidak ditemukan.');
    const title = String(data.title || 'Konten TikTok').slice(0, 500);
    if (data.no_watermark) {
      await assertPublicHttpUrl(data.no_watermark);
      const { buffer, contentType } = await ctx.services.media.downloadBuffer(data.no_watermark, { maxBytes: 20 * 1024 * 1024, timeoutMs: 25000 });
      if (contentType.startsWith('video/')) {
        await ctx.sendMessage(ctx.chat, { video: buffer, mimetype: contentType, caption: `🎥 *Video TikTok*\n\n${title}` }, { quoted: ctx.m.raw });
        if (data.music) await sendRemoteAudio(ctx, data.music);
        return;
      }
    }
    const images = Array.isArray(data.image) ? data.image.slice(0, 8) : [];
    if (!images.length && data.cover) images.push(data.cover);
    for (const [index, imageUrl] of images.entries()) {
      await assertPublicHttpUrl(imageUrl);
      const { buffer, contentType } = await ctx.services.media.downloadBuffer(imageUrl, { maxBytes: 10 * 1024 * 1024 });
      if (!contentType.startsWith('image/')) continue;
      await ctx.sendMessage(ctx.chat, { image: buffer, caption: `🖼 Gambar ${index + 1}\n${title}` }, { quoted: ctx.m.raw });
    }
    if (data.music) await sendRemoteAudio(ctx, data.music);
  }
};
async function sendRemoteAudio(ctx, url) {
  await assertPublicHttpUrl(url);
  const { buffer, contentType } = await ctx.services.media.downloadBuffer(url, { maxBytes: 12 * 1024 * 1024, timeoutMs: 20000 });
  if (!contentType.startsWith('audio/')) throw new Error('Audio TikTok tidak valid.');
  await ctx.sendMessage(ctx.chat, { audio: buffer, mimetype: contentType, ptt: true }, { quoted: ctx.m.raw });
}
