'use strict';

const { fetchPublic } = require('../security/safe-url');

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 5;

async function downloadBuffer(url, { maxBytes = 20 * 1024 * 1024, timeoutMs = 15000, headers = {} } = {}) {
  let current;
  try { current = new URL(url); } catch { throw new Error('URL media tidak valid.'); }
  if (current.protocol !== 'https:') throw new Error('URL media harus menggunakan HTTPS.');
  // CDN media (TikTok/Akamai, Instagram/fbcdn) sering menolak request tanpa
  // User-Agent dengan HTTP 403. Kirim UA browser bila pemanggil tidak
  // menentukan header sendiri; header eksplisit pemanggil tetap menang.
  const requestHeaders = {
    'user-agent': 'Mozilla/5.0 (compatible; MUSE-MD/2.0)',
    accept: '*/*',
    ...headers
  };

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const response = await fetchPublic(current.toString(), { maxBytes, timeoutMs, headers: requestHeaders });
    if (REDIRECT_STATUSES.has(response.status)) {
      if (redirects === MAX_REDIRECTS) throw new Error('Terlalu banyak redirect saat mengunduh media.');
      const location = response.headers.get('location');
      if (!location) throw new Error('Server media mengirim redirect tanpa alamat tujuan.');
      let next;
      try { next = new URL(location, current); } catch { throw new Error('Alamat redirect media tidak valid.'); }
      if (next.protocol !== 'https:') throw new Error('Redirect media ke koneksi non-HTTPS ditolak.');
      current = next;
      continue;
    }
    if (!response.ok) throw new Error(`Unduhan gagal dengan HTTP ${response.status}.`);
    return {
      buffer: response.buffer,
      contentType: response.headers.get('content-type') || 'application/octet-stream',
      finalUrl: current.toString()
    };
  }
  throw new Error('Unduhan media gagal setelah mengikuti redirect.');
}

module.exports = { downloadBuffer, MAX_REDIRECTS };
