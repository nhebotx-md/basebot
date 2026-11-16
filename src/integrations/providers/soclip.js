'use strict';

const { postPublicJson } = require('../../core/security/safe-url');

const SOCLIP_ENDPOINT = 'https://api.soclip.dev/v1/media';

function normalizeSoclipResponse(payload) {
  if (!payload?.success || !payload?.data || !Array.isArray(payload.data.medias)) {
    const message = typeof payload?.error === 'string' ? payload.error : 'Soclip tidak mengembalikan daftar media.';
    throw new Error(message.slice(0, 240));
  }
  const medias = payload.data.medias
    .filter(item => item && typeof item.url === 'string' && /^https:\/\//i.test(item.url))
    .slice(0, 12)
    .map(item => ({
      url: item.url,
      type: String(item.type || item.ext || '').toLowerCase(),
      ext: String(item.ext || '').toLowerCase(),
      quality: String(item.quality || item.label || '').slice(0, 32)
    }));
  if (!medias.length) throw new Error('Soclip tidak menyediakan tautan media HTTPS.');
  return {
    source: String(payload.data.source || '').toLowerCase(),
    title: String(payload.data.title || 'Media').slice(0, 300),
    author: String(payload.data.author || '').slice(0, 120),
    duration: Number.isFinite(Number(payload.data.duration)) ? Number(payload.data.duration) : null,
    thumbnail: typeof payload.data.thumbnail === 'string' ? payload.data.thumbnail : '',
    medias,
    creditsUsed: Number(payload.credits_used) || 0,
    creditsRemaining: Number.isFinite(Number(payload.credits_remaining)) ? Number(payload.credits_remaining) : null
  };
}

async function soclipResolve(input, { apiKey, post = postPublicJson } = {}) {
  if (!apiKey) throw new Error('SOCLIP_API_KEY belum diatur pada file .env.');
  const response = await post(SOCLIP_ENDPOINT, { url: input }, {
    timeoutMs: 30000,
    maxBytes: 1024 * 1024,
    maxRequestBytes: 16 * 1024,
    headers: { authorization: `Bearer ${apiKey}` }
  });
  let payload;
  try { payload = JSON.parse(response.buffer.toString('utf8')); }
  catch { throw new Error(`Soclip mengirim JSON tidak valid (HTTP ${response.status}).`); }
  if (!response.ok) {
    const detail = typeof payload?.error === 'string' ? payload.error : payload?.message;
    throw new Error(`Soclip HTTP ${response.status}: ${String(detail || 'request gagal').slice(0, 180)}`);
  }
  return normalizeSoclipResponse(payload);
}

module.exports = { SOCLIP_ENDPOINT, normalizeSoclipResponse, soclipResolve };
