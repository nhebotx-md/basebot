'use strict';
const { fetchPublic } = require('../../core/security/safe-url');

async function json(url, options = {}) {
  const response = await fetchPublic(url, {
    timeoutMs: 15000, maxBytes: 256 * 1024, headers: options.headers || {}
  });
  if (!response.ok) throw new Error(`Layanan converter mengembalikan HTTP ${response.status}.`);
  return JSON.parse(response.buffer.toString('utf8'));
}

async function ytmp3(input) {
  const url = new URL(input);
  if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(url.hostname.toLowerCase())) {
    throw new Error('URL bukan video YouTube yang didukung.');
  }
  const id = url.hostname.endsWith('youtu.be') ? url.pathname.slice(1) : url.searchParams.get('v');
  if (!id || !/^[\w-]{6,20}$/.test(id)) throw new Error('ID YouTube tidak valid.');
  const headers = { accept: '*/*', 'user-agent': 'Mozilla/5.0', referer: 'https://id.ytmp3.mobi/' };
  const init = await json(`https://d8.ymcdn.org/api/v1/init?p=y&23=1llum1n471&_=${Date.now()}`, { headers });
  if (typeof init.convertURL !== 'string') throw new Error('Layanan converter tidak tersedia.');
  const convertUrl = new URL(init.convertURL);
  convertUrl.searchParams.set('v', id);
  convertUrl.searchParams.set('f', 'mp3');
  convertUrl.searchParams.set('_', String(Date.now()));
  const convert = await json(convertUrl, { headers });
  if (convert.error !== 0 || !convert.progressURL || !convert.downloadURL) {
    throw new Error('Konversi audio gagal dimulai.');
  }
  let info = {};
  for (let attempt = 0; attempt < 5; attempt += 1) {
    info = await json(convert.progressURL, { headers });
    if (info.progress === 3) break;
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  if (info.progress !== 3) throw new Error('Konversi audio melewati batas waktu.');
  return { urlmp3: convert.downloadURL, title: info.title || 'Audio YouTube' };
}

module.exports = { ytmp3 };
