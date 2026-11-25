'use strict';

const { getPluginProgress } = require('../../src/core/services/plugin-progress.service');

const ALLOWED_HOSTS = new Set(['facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.watch', 'www.fb.watch']);

function validateFacebookUrl(input) {
  let url;
  try { url = new URL(String(input || '').trim()); }
  catch { throw new Error('Masukkan tautan Facebook yang valid.'); }
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname.toLowerCase()) || url.username || url.password) {
    throw new Error('Gunakan tautan HTTPS Facebook atau fb.watch yang valid.');
  }
  return url.toString();
}

module.exports = {
  name: 'facebook-downloader',
  commands: ['facebook', 'fb', 'fbdl', 'fbvideo'],
  category: 'downloader',
  description: 'Mengunduh video dan foto Facebook melalui layanan downloader (Soclip, fallback yt-dlp lokal).',
  usage: '.fb <tautan Facebook publik>',
  permissions: {},
  async execute(ctx) {
    const progress = getPluginProgress(ctx);
    let source;
    try { source = validateFacebookUrl(ctx.text); }
    catch (error) { return ctx.reply(error.message + '\nContoh: ' + ctx.prefix + 'fb https://www.facebook.com/watch/?v=...'); }

    await progress.start('Memvalidasi tautan Facebook', {
      detail: 'Memeriksa URL dan menyiapkan provider downloader.'
    });
    try {
      await progress.update('Mengambil metadata Facebook', {
        detail: 'Meminta daftar media dari layanan downloader.'
      });
      // Lewat downloader service agar Facebook ikut rantai fallback
      // (Soclip -> yt-dlp lokal) seperti downloader lain, bukan Soclip saja.
      const result = await ctx.services.downloaders.facebook(source);
      if (result.buffer) {
        const contentType = String(result.contentType || '');
        if (!contentType.startsWith('video/') && !contentType.startsWith('image/')) {
          throw new Error('Provider tidak mengembalikan file media.');
        }
        await progress.update('Mengirim media Facebook', {
          detail: 'Media hasil fallback siap dikirim.'
        });
        const message = contentType.startsWith('image/')
          ? { image: result.buffer, caption: 'Facebook · ' + (result.title || '') }
          : { video: result.buffer, mimetype: contentType, caption: 'Facebook · ' + (result.title || '') };
        await ctx.sendMessage(ctx.chat, message, { quoted: ctx.m.raw });
        return progress.update('Downloader Facebook selesai', { detail: '1 media berhasil dikirim.' });
      }
      const items = (result.data || []).filter(item => item?.url).slice(0, 8);
      if (!items.length) throw new Error('Provider tidak mengembalikan media Facebook.');
      let sent = 0;
      const images = [];
      for (const [index, item] of items.entries()) {
        const kind = String(item.type || item.ext || '').toLowerCase();
        const isImage = kind === 'image' || /^(jpg|jpeg|png|webp|gif)$/.test(kind);
        await progress.update('Mengunduh media ' + (index + 1) + '/' + items.length, {
          detail: 'Memeriksa alamat file dan mengunduh media dari provider.'
        });
        const media = await ctx.services.media.downloadBuffer(item.url, {
          maxBytes: 25 * 1024 * 1024,
          timeoutMs: 30000
        });
        if (!Buffer.isBuffer(media.buffer) || media.buffer.length === 0) continue;
        if (isImage && media.contentType.startsWith('image/')) {
          images.push({ image: media.buffer, caption: 'Facebook · ' + result.title });
          continue;
        }
        if (!isImage && media.contentType.startsWith('video/')) {
          await ctx.sendMessage(ctx.chat, {
            video: media.buffer,
            mimetype: media.contentType,
            caption: 'Facebook · ' + result.title
          }, { quoted: ctx.m.raw });
          sent += 1;
        }
      }
      if (images.length) {
        await progress.update('Mengirim foto Facebook', {
          detail: images.length + ' foto siap dikirim.'
        });
        if (typeof ctx.client?.albumMessage === 'function' && images.length > 1) {
          await ctx.client.albumMessage(ctx.chat, images, ctx.m.raw);
        } else {
          for (const item of images) await ctx.sendMessage(ctx.chat, item, { quoted: ctx.m.raw });
        }
        sent += images.length;
      }
      if (!sent) throw new Error('Tidak ada file video/foto yang berhasil diunduh.');
      await progress.update('Downloader Facebook selesai', { detail: sent + ' media berhasil dikirim.' });
    } catch (error) {
      await progress.fail('Downloader Facebook gagal', {
        detail: 'Provider gagal atau file media tidak lolos validasi.'
      });
      ctx.logger?.warn?.('Facebook downloader gagal.', { error: error?.message || 'Unknown error' });
      await ctx.reply('Gagal mengunduh Facebook: ' + String(error?.message || 'provider tidak tersedia').slice(0, 200));
    }
  }
};

module.exports.validateFacebookUrl = validateFacebookUrl;
