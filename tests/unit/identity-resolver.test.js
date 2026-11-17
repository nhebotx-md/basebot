'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { IdentityResolver } = require('../../src/core/services/identity-resolver.service');

test('identity resolver maps LID to phone identity and caches both directions', async () => {
  let calls = 0;
  const client = {
    decodeJid: value => value,
    async findUserId(value) {
      calls += 1;
      assert.equal(value, '12345@lid');
      return { lid: '12345@lid', phoneNumber: '628123456789@s.whatsapp.net' };
    }
  };
  const resolver = new IdentityResolver(client);
  assert.equal(await resolver.resolve('12345@lid'), '628123456789@s.whatsapp.net');
  assert.equal(await resolver.resolve('12345@lid'), '628123456789@s.whatsapp.net');
  assert.equal(await resolver.resolve('628123456789@s.whatsapp.net'), '628123456789@s.whatsapp.net');
  assert.equal(calls, 1);
  assert.equal(resolver.size, 2);
  assert.equal(resolver.invalidate('12345@lid'), true);
  assert.equal(resolver.size, 0);
});

test('identity resolver falls back to the original LID when mapping fails', async () => {
  const client = {
    decodeJid: value => value,
    signalRepository: { lidMapping: { async getPNForLID() { throw new Error('mapping unavailable'); } } },
    async findUserId() { throw new Error('lookup unavailable'); }
  };
  const resolver = new IdentityResolver(client);
  const result = await resolver.resolvePair('99999@lid');
  assert.equal(result.identity, '99999@lid');
  assert.equal(result.phoneNumber, '');
  assert.equal(result.lid, '99999@lid');
});
