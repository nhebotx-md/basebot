'use strict';
const { fetchPublic } = require('../security/safe-url');

async function downloadBuffer(url, { maxBytes = 20 * 1024 * 1024, timeoutMs = 15000, headers = {} } = {}) {
  const response = await fetchPublic(url, { maxBytes, timeoutMs, headers });
  if (!response.ok) throw new Error(`Unduhan gagal dengan HTTP ${response.status}.`);
  return { buffer: response.buffer, contentType: response.headers.get('content-type') || 'application/octet-stream' };
}
module.exports = { downloadBuffer };
