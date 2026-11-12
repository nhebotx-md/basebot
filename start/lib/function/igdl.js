'use strict';
const fetch = require('node-fetch');
async function igdl(input) {
  const url = new URL(input);
  if (!['instagram.com', 'www.instagram.com', 'm.instagram.com'].includes(url.hostname.toLowerCase()) || url.protocol !== 'https:') throw new Error('Gunakan tautan Instagram HTTPS yang valid.');
  const response = await fetch(`https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(url.href)}`, { timeout: 15000, size: 256 * 1024, redirect: 'error' });
  if (!response.ok) throw new Error(`Layanan Instagram mengembalikan HTTP ${response.status}.`);
  return response.json();
}
module.exports = { igdl };
