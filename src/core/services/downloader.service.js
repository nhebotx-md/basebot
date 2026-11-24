'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { igdl: instagramIgdl } = require('../../integrations/providers/instagram');
const { remini } = require('../../integrations/providers/image-enhancer');
const { ytmp3: legacyYtmp3 } = require('../../integrations/providers/youtube');
const { soclipResolve } = require('../../integrations/providers/soclip');
const axios = require('axios');
const { ProviderManager } = require('./provider-manager.service');
const execFileAsync = promisify(execFile);

function validateSource(input, allowedHosts, label) {
  let url;
  try { url = new URL(input); } catch { throw new Error('URL tidak valid.'); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || !allowedHosts.some(domain => host === domain || host.endsWith('.' + domain))) {
    throw new Error(`Gunakan tautan HTTPS ${label} yang valid.`);
  }
  if (url.username || url.password) throw new Error('URL tidak boleh memuat kredensial.');
  return url;
}

async function downloadWithYtDlp(input, { binary = 'yt-dlp', tempDir = './storage/temp', timeoutMs = 90000 } = {}) {
  await fs.mkdir(tempDir, { recursive: true });
  const root = await fs.mkdtemp(path.join(tempDir, 'basebot-downloader-'));
  const output = path.join(root, 'audio.%(ext)s');
  try {
    await execFileAsync(binary, [
      '--no-playlist', '--extract-audio', '--audio-format', 'mp3',
      '--max-filesize', '20M', '--no-part', '--no-progress', '--no-warnings',
      '--output', output, '--', input
    ], { timeout: timeoutMs, maxBuffer: 1024 * 1024, windowsHide: true });
    const files = await fs.readdir(root);
    const audioFile = files.find(file => /^audio\.mp3$/i.test(file));
    if (!audioFile) throw new Error('yt-dlp tidak menghasilkan file MP3.');
    const filePath = path.join(root, audioFile);
    const stat = await fs.stat(filePath);
    if (!stat.isFile() || stat.size < 1 || stat.size > 20 * 1024 * 1024) throw new Error('Ukuran audio hasil yt-dlp tidak valid.');
    return { buffer: await fs.readFile(filePath), contentType: 'audio/mpeg', title: 'Audio YouTube', provider: 'yt-dlp' };
  } finally {
    await fs.rm(root, { recursive: true, force: true }).catch(() => {});
  }
}

function createDownloaderService(config = {}, adapters = {}) {
  const soclip = adapters.soclip || (url => soclipResolve(url, { apiKey: config.soclipApiKey }));
  const igdlProvider = adapters.igdl || instagramIgdl;
  const legacyAudio = adapters.ytmp3 || legacyYtmp3;
  const ytDlpAudio = adapters.ytdlpAudio || (url => downloadWithYtDlp(url, {
    binary: config.ytDlpPath || 'yt-dlp', tempDir: config.tempDir || './storage/temp'
  }));
  const providerManager = adapters.providerManager || new ProviderManager(config.providerOptions || { timeoutMs: config.providerTimeoutMs, retries: config.providerRetries, failureThreshold: config.providerFailureThreshold, cooldownMs: config.providerCooldownMs });
  const tikwmProvider = adapters.tikwm || (async url => {
    const body = new URLSearchParams({ url, count: '12', cursor: '0', web: '1', hd: '1' });
    const response = await axios.post('https://www.tikwm.com/api/', body.toString(), {
      headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', 'user-agent': 'Mozilla/5.0 BaseBot/2.0' },
      timeout: 25000, maxRedirects: 0, maxContentLength: 1024 * 1024
    });
    const payload = response.data;
    const data = payload?.data;
    if (payload?.code !== 0 || !data) throw new Error(String(payload?.msg || 'TikWM tidak menemukan media TikTok.').slice(0, 180));
    const imageItems = Array.isArray(data.images) ? data.images : [];
    const images = imageItems.map(item => {
      if (typeof item === 'string') return item;
      if (typeof item?.url === 'string') return item.url;
      if (Array.isArray(item?.url_list)) return item.url_list.find(value => typeof value === 'string' && /^https:\/\//i.test(value)) || '';
      return '';
    }).filter(Boolean).slice(0, 10);
    const videoUrl = typeof data.hdplay === 'string' && data.hdplay ? data.hdplay : (typeof data.play === 'string' ? data.play : '');
    return {
      title: String(data.title || 'Konten TikTok').slice(0, 500),
      videoUrl,
      images,
      audioUrl: typeof data.music === 'string' ? data.music : '',
      provider: 'tikwm'
    };
  });
  const tikTokProvider = adapters.tiktok || (async url => {
    const response = await axios.get('https://www.laurine.site/api/downloader/tiktok', {
      params: { url }, timeout: 15000, maxRedirects: 0, maxContentLength: 1024 * 1024
    });
    const data = response.data?.data;
    if (!response.data?.status || !data) throw new Error('Provider TikTok lama tidak menemukan media.');
    return {
      title: String(data.title || 'Konten TikTok').slice(0, 500),
      videoUrl: typeof data.no_watermark === 'string' ? data.no_watermark : '',
      images: Array.isArray(data.image) ? data.image.slice(0, 10) : [],
      audioUrl: typeof data.music === 'string' ? data.music : ''
    };
  });

  async function providerChain(label, providers) {
    const errors = [];
    for (let index = 0; index < providers.length; index += 1) {
      if (index > 0 && !config.fallbackEnabled) break;
      const [name, run] = providers[index];
      try {
        return await providerManager.run(name, run, {
          timeoutMs: config.providerTimeoutMs || 30000,
          retries: config.providerRetries ?? 0,
          failureThreshold: config.providerFailureThreshold ?? 2,
          cooldownMs: config.providerCooldownMs || 30000
        });
      } catch (error) { errors.push(`${name}: ${String(error?.message || error).slice(0, 180)}`); }
    }
    const error = new Error(`${label} gagal. ${errors.join(' | ') || 'Tidak ada provider aktif.'}`);
    error.providerErrors = errors;
    throw error;
  }

  function socialMedia(result) {
    return (result.medias || []).filter(item => item.type !== 'audio' && item.ext !== 'mp3')
      .map(item => ({ url: item.url, type: item.type === 'image' || item.ext.match(/^(jpg|jpeg|png|webp|heic)$/) ? 'image' : 'video' }))
      .slice(0, 8);
  }

  return Object.freeze({
    remini,
    providerStatus() { return providerManager.status(); },
    async igdl(input) {
      validateSource(input, ['instagram.com'], 'Instagram');
      return providerChain('Instagram downloader', [
        ['Soclip', async () => {
          const result = await soclip(input);
          const data = socialMedia(result);
          if (!data.length) throw new Error('Tidak ada foto/video pada respons Soclip.');
          return { data, title: result.title, provider: 'soclip' };
        }],
        ['provider Instagram cadangan', async () => {
          const result = await igdlProvider(input);
          if (!Array.isArray(result?.data) || !result.data.some(item => typeof item?.url === 'string')) throw new Error('Provider lama tidak mengembalikan media.');
          return { ...result, provider: 'legacy' };
        }]
      ]);
    },
    async tiktok(input) {
      validateSource(input, ['tiktok.com'], 'TikTok');
      return providerChain('TikTok downloader', [
        ['TikWM gratis', async () => {
          const result = await tikwmProvider(input);
          if (!result?.videoUrl && !result?.images?.length && !result?.audioUrl) throw new Error('TikWM tidak mengembalikan media yang didukung.');
          return { ...result, provider: 'tikwm' };
        }],
        ['Soclip', async () => {
          const result = await soclip(input);
          const video = result.medias.find(item => item.type === 'video' || item.ext === 'mp4');
          const images = result.medias.filter(item => item.type === 'image' || /^(jpg|jpeg|png|webp|heic)$/i.test(item.ext)).map(item => item.url).slice(0, 10);
          const audio = result.medias.find(item => item.type === 'audio' || item.ext === 'mp3');
          if (!video && !images.length && !audio) throw new Error('Respons Soclip tidak berisi video, slideshow, atau audio.');
          return { title: result.title, videoUrl: video?.url || '', images, audioUrl: audio?.url || '', provider: 'soclip' };
        }],
        ['provider TikTok cadangan', async () => {
          const result = await tikTokProvider(input);
          if (!result?.videoUrl && !result?.images?.length && !result?.audioUrl) throw new Error('Provider lama tidak mengembalikan media.');
          return { ...result, provider: 'legacy' };
        }]
      ]);
    },
    async ytmp3(input) {
      validateSource(input, ['youtube.com', 'youtu.be'], 'YouTube');
      return providerChain('YouTube audio downloader', [
        ['Soclip', async () => {
          const result = await soclip(input);
          const audio = result.medias.find(item => item.type === 'audio' || item.ext === 'mp3' || item.quality === 'audio');
          if (!audio) throw new Error('Soclip tidak menyediakan audio untuk tautan ini.');
          return { urlmp3: audio.url, title: result.title, provider: 'soclip' };
        }],
        ['converter YouTube cadangan', async () => {
          const result = await legacyAudio(input);
          if (typeof result?.urlmp3 !== 'string' || !result.urlmp3) throw new Error('Converter lama tidak mengembalikan URL audio.');
          return { ...result, provider: 'legacy' };
        }],
        ['yt-dlp lokal', async () => {
          if (config.ytDlpEnabled === false) throw new Error('Fallback yt-dlp dinonaktifkan.');
          return ytDlpAudio(input);
        }]
      ]);
    }
  });
}

module.exports = { createDownloaderService, downloadWithYtDlp, validateSource };
