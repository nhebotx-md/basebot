'use strict';

const dns = require('node:dns/promises');
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const { Readable } = require('node:stream');

function ipv6Words(address) {
  let value = address.toLowerCase();
  const dotted = value.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const octets = dotted[1].split('.').map(Number);
    if (octets.some(octet => !Number.isInteger(octet) || octet < 0 || octet > 255)) return null;
    const high = ((octets[0] << 8) | octets[1]).toString(16);
    const low = ((octets[2] << 8) | octets[3]).toString(16);
    value = value.slice(0, -dotted[1].length) + high + ':' + low;
  }
  const halves = value.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) return null;
  const parts = [...left, ...Array(missing).fill('0'), ...right];
  if (parts.length !== 8 || parts.some(part => !/^[0-9a-f]{1,4}$/.test(part))) return null;
  return parts.map(part => Number.parseInt(part, 16));
}

function isPrivateAddress(address) {
  const family = net.isIP(address);
  if (family === 4) {
    const octets = address.split('.').map(Number);
    const [a, b, c] = octets;
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)) || (b === 88 && c === 99))) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113) || a >= 224;
  }
  if (family === 6) {
    const value = address.toLowerCase();
    if (value === '::' || value === '::1' || value.startsWith('fc') || value.startsWith('fd') || /^fe[89ab]/.test(value) || value.startsWith('ff') || value.startsWith('fec')) return true;
    if (/^2001:db8(?:[:/]|$)/.test(value) || /^2001:10(?:[:/]|$)/.test(value)) return true;
    const words = ipv6Words(value);
    if (!words) return true;
    if (words.slice(0, 5).every(word => word === 0) && words[5] === 0xffff) return isPrivateAddress(`${words[6] >> 8}.${words[6] & 255}.${words[7] >> 8}.${words[7] & 255}`);
    if (words.slice(0, 6).every(word => word === 0) && (words[6] !== 0 || words[7] !== 0)) return true;
    return false;
  }
  return true;
}

function parseHttpUrl(input) {
  let url;
  try { url = new URL(input); } catch { throw new Error('URL tidak valid.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('URL harus HTTP/HTTPS tanpa kredensial.');
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal')) throw new Error('Hostname lokal/internal tidak diizinkan.');
  return { url, hostname };
}

async function resolvePublicTarget(input, dnsTimeoutMs = 5000) {
  const { url, hostname } = parseHttpUrl(input);
  let addresses;
  if (net.isIP(hostname)) addresses = [{ address: hostname, family: net.isIP(hostname) }];
  else {
    let timer;
    try {
      addresses = await Promise.race([
        dns.lookup(hostname, { all: true, verbatim: true }),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('DNS lookup melewati batas waktu.')), dnsTimeoutMs); timer.unref?.(); })
      ]);
    } finally { clearTimeout(timer); }
  }
  if (!addresses?.length || addresses.some(record => isPrivateAddress(record.address))) throw new Error('URL mengarah ke alamat privat atau tidak publik.');
  return { url, hostname, address: addresses[0].address, family: addresses[0].family || net.isIP(addresses[0].address) };
}

async function assertPublicHttpUrl(input) {
  const target = await resolvePublicTarget(input);
  return target.url;
}

async function fetchPublic(input, { timeoutMs = 15000, maxBytes = 8 * 1024 * 1024, headers = {} } = {}) {
  const { url, hostname, address, family } = await resolvePublicTarget(input);
  if (!Number.isFinite(maxBytes) || maxBytes < 0) throw new Error('Batas ukuran respons tidak valid.');
  const agent = url.protocol === 'https:' ? https : http;
  const pinnedLookup = (_hostname, options, callback) => {
    if (options?.all) callback(null, [{ address, family }]);
    else callback(null, address, family);
  };
  const safeHeaders = {};
  for (const [name, value] of Object.entries(headers)) {
    if (/^(host|connection|proxy-authorization|transfer-encoding)$/i.test(name)) continue;
    safeHeaders[name] = value;
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = error => { if (settled) return; settled = true; reject(error); };
    const request = agent.request({
      protocol: url.protocol, hostname, port: url.port || undefined,
      path: `${url.pathname}${url.search}`, method: 'GET', headers: safeHeaders,
      servername: net.isIP(hostname) ? undefined : hostname, lookup: pinnedLookup
    }, response => {
      const declared = Number(response.headers['content-length']);
      if (Number.isFinite(declared) && declared > maxBytes) { request.destroy(new Error('Respons melebihi batas ukuran.')); return; }
      const chunks = []; let size = 0;
      response.on('data', chunk => {
        size += chunk.length;
        if (size > maxBytes) { request.destroy(new Error('Respons melebihi batas ukuran.')); return; }
        chunks.push(Buffer.from(chunk));
      });
      response.on('error', fail);
      response.on('end', () => {
        if (settled) return;
        settled = true;
        const body = Buffer.concat(chunks, size);
        resolve({ status: response.statusCode || 0, ok: response.statusCode >= 200 && response.statusCode < 300,
          headers: { get(name) { const value = response.headers[String(name).toLowerCase()]; return Array.isArray(value) ? value.join(', ') : value || null; } },
          body: Readable.from([body]), buffer: body });
      });
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error('Request melewati batas waktu.')));
    request.on('error', fail);
    request.end();
  });
}

async function readResponseLimited(response, maximumBytes) {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maximumBytes) throw new Error('Respons melebihi batas ukuran.');
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > maximumBytes) throw new Error('Respons melebihi batas ukuran.');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks, size);
}

module.exports = { assertPublicHttpUrl, fetchPublic, isPrivateAddress, readResponseLimited };
