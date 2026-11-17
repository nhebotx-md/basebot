'use strict';

const { normalizeIdentity } = require('../security/permission-manager');

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 5000;
const resolverCache = new WeakMap();

function isPhoneIdentity(value) {
  return typeof value === 'string' && /@(s\.whatsapp\.net|c\.us)$/i.test(value);
}

class IdentityResolver {
  constructor(client, { ttlMs = DEFAULT_TTL_MS, maxEntries = DEFAULT_MAX_ENTRIES, clock = Date.now } = {}) {
    if (!client || (typeof client !== 'object' && typeof client !== 'function')) throw new TypeError('IdentityResolver membutuhkan client WhatsApp.');
    this.client = client;
    this.ttlMs = Math.max(1000, Number(ttlMs) || DEFAULT_TTL_MS);
    this.maxEntries = Math.max(100, Number(maxEntries) || DEFAULT_MAX_ENTRIES);
    this.clock = clock;
    this.cache = new Map();
  }

  _read(identity) {
    const cached = this.cache.get(identity);
    if (!cached) return null;
    if (cached.expiresAt <= this.clock()) { this.cache.delete(identity); return null; }
    this.cache.delete(identity);
    this.cache.set(identity, cached);
    return cached.value;
  }

  _write(identities, value) {
    const entry = { value, expiresAt: this.clock() + this.ttlMs };
    for (const identity of identities.filter(Boolean)) {
      this.cache.delete(identity);
      this.cache.set(identity, entry);
    }
    while (this.cache.size > this.maxEntries) this.cache.delete(this.cache.keys().next().value);
  }

  async resolvePair(value) {
    const identity = normalizeIdentity(value, this.client.decodeJid);
    if (!identity) return { identity: '', phoneNumber: '', lid: '', identities: [] };
    const cached = this._read(identity);
    if (cached) return cached;

    let phoneNumber = isPhoneIdentity(identity) ? identity : '';
    let lid = identity.endsWith('@lid') ? identity : '';
    const mapping = this.client.signalRepository?.lidMapping;

    if (lid && typeof mapping?.getPNForLID === 'function') {
      try { phoneNumber = normalizeIdentity(await mapping.getPNForLID(lid), this.client.decodeJid) || phoneNumber; }
      catch { /* LID mapping is optional; retain the original identity. */ }
    }

    if (typeof this.client.findUserId === 'function') {
      try {
        const found = await this.client.findUserId(identity);
        phoneNumber = normalizeIdentity(found?.phoneNumber, this.client.decodeJid) || phoneNumber;
        lid = normalizeIdentity(found?.lid, this.client.decodeJid) || lid;
      } catch {
        // Never turn a failed directory lookup into an identity/permission match.
      }
    }

    const identities = [...new Set([phoneNumber, lid, identity].filter(Boolean))];
    const primary = phoneNumber || lid || identity;
    const result = { identity: primary, phoneNumber, lid, identities };
    this._write(identities, result);
    return result;
  }

  async resolve(value) {
    return (await this.resolvePair(value)).identity;
  }

  async resolveBest(values) {
    let fallback = '';
    for (const value of values || []) {
      const result = await this.resolvePair(value);
      if (!result.identity) continue;
      if (!fallback) fallback = result.identity;
      if (result.phoneNumber) return result.phoneNumber;
    }
    return fallback;
  }

  invalidate(value) {
    const identity = normalizeIdentity(value, this.client.decodeJid);
    const cached = identity ? this.cache.get(identity) : null;
    if (cached) {
      for (const key of this.cache.keys()) if (this.cache.get(key) === cached) this.cache.delete(key);
      return true;
    }
    return false;
  }

  clear() { this.cache.clear(); }
  get size() { return this.cache.size; }
}

function getIdentityResolver(client, options) {
  let resolver = resolverCache.get(client);
  if (!resolver) { resolver = new IdentityResolver(client, options); resolverCache.set(client, resolver); }
  return resolver;
}

module.exports = { IdentityResolver, getIdentityResolver, isPhoneIdentity, DEFAULT_TTL_MS, DEFAULT_MAX_ENTRIES };
