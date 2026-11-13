'use strict';
const axios = require('axios');
const FormData = require('form-data');

async function remini(input, method = 'enhance') {
  if (!Buffer.isBuffer(input) || input.length === 0 || input.length > 10 * 1024 * 1024) {
    throw new Error('Gambar harus berupa Buffer maksimal 10 MB.');
  }
  const allowed = new Set(['enhance', 'recolor', 'dehaze']);
  const operation = allowed.has(method) ? method : 'enhance';
  const form = new FormData();
  form.append('model_version', '1');
  form.append('image', input, { filename: 'input.jpg', contentType: 'image/jpeg' });
  const response = await axios.post(`https://inferenceengine.vyro.ai/${operation}`, form, {
    headers: { ...form.getHeaders(), 'User-Agent': 'BASEBOT/2.0' },
    timeout: 30000, maxRedirects: 0, maxBodyLength: 12 * 1024 * 1024,
    maxContentLength: 20 * 1024 * 1024, responseType: 'arraybuffer',
    validateStatus: status => status >= 200 && status < 300
  });
  const result = Buffer.from(response.data);
  if (!result.length || result.length > 20 * 1024 * 1024) {
    throw new Error('Respons image enhancer tidak valid.');
  }
  return result;
}

module.exports = { remini };
