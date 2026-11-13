'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildContext } = require('../../src/core/messaging/context-builder');
const { normalizeMessage } = require('../../src/core/messaging/normalize-message');
const { PluginRegistry } = require('../../src/core/plugins/plugin-registry');
const { loadConfig } = require('../../src/config/config-loader');
const logger = { info() {}, debug() {}, warn() {}, error() {} };
function fixture(command, permissions = {}) {
  const registry = new PluginRegistry();
  registry.register({ name: command, commands: [command], category: 'test', description: 'test', usage: `.${command}`, permissions, execute: async () => {} });
  let lookups = 0;
  const client = { user: { id: '6281234567890:5@s.whatsapp.net' }, public: true, decodeJid: value => value?.replace(/:\d+@/, '@'), sendMessage: async () => {}, groupMetadata: async () => { lookups += 1; return { participants: [{ id: '6281111111111@s.whatsapp.net', admin: 'admin' }, { id: '6281234567890@s.whatsapp.net', admin: 'superadmin' }] }; } };
  const raw = { key: { remoteJid: '120363000000000000@g.us', participant: '6281111111111@s.whatsapp.net', id: 'id1' }, message: { conversation: `.${command}` } };
  const m = normalizeMessage(raw, client);
  return { client, registry, m, getLookups: () => lookups };
}
const config = () => loadConfig({ OWNER_NUMBERS: '6281234567890', BOT_PREFIX: '.', TEMP_DIR: '/tmp/basebot-test-temp', SESSION_DIR: '/tmp/basebot-test-session', PLUGINS_DIR: './plugins' });

test('context fetches metadata only for admin-gated commands and grants normalized owner admin flags', async () => {
  const regular = fixture('ping');
  const a = await buildContext({ ...regular, config: config(), logger, store: {} });
  assert.equal(regular.getLookups(), 0);
  assert.equal(a.isGroupAdmin, false);
  const admin = fixture('admin', { adminOnly: true });
  const b = await buildContext({ ...admin, config: config(), logger, store: {} });
  assert.equal(admin.getLookups(), 1);
  assert.equal(b.isGroupAdmin, true);
  assert.equal(b.isOwner, false);
});

test('self-sent messages from the connected bot account are treated as owner', async () => {
  const f = fixture('ping');
  f.m.fromMe = true;
  f.m.sender = f.client.user.id;
  const context = await buildContext({ ...f, config: config(), logger, store: {} });
  assert.equal(context.isOwner, true);
});

test('owner is recognized when the incoming sender LID resolves to the configured phone JID', async () => {
  const f = fixture('ping');
  let mappedLid = '';
  f.client.signalRepository = {
    lidMapping: {
      async getPNForLID(lid) {
        mappedLid = lid;
        return '6281234567890@s.whatsapp.net';
      }
    }
  };
  f.m.sender = '987654321@lid';
  f.m.senderCandidates = ['987654321@lid'];
  const context = await buildContext({ ...f, config: config(), logger, store: {} });
  assert.equal(mappedLid, '987654321@lid');
  assert.equal(context.sender, '6281234567890@s.whatsapp.net');
  assert.equal(context.isOwner, true);
});

test('unmapped LID never matches a configured phone-number owner', async () => {
  const f = fixture('ping');
  f.client.signalRepository = { lidMapping: { async getPNForLID() { return null; } } };
  f.m.sender = '987654321@lid';
  f.m.senderCandidates = ['987654321@lid'];
  const context = await buildContext({ ...f, config: config(), logger, store: {} });
  assert.equal(context.isOwner, false);
});

test('newsletter publisher is recognized as owner without treating the channel JID as sender', async () => {
  const f = fixture('ping');
  const raw = {
    key: { remoteJid: '120363000000000000@newsletter', id: 'newsletter-owner-post' },
    newsletterMeta: { adminProfile: { id: '6281234567890@s.whatsapp.net', name: 'Channel Owner' } },
    message: { conversation: '.ping' }
  };
  f.m = normalizeMessage(raw, f.client);
  const context = await buildContext({ ...f, config: config(), logger, store: {} });
  assert.equal(context.isNewsletter, true);
  assert.equal(context.isChannel, true);
  assert.equal(context.isPrivate, false);
  assert.equal(context.sender, '6281234567890@s.whatsapp.net');
  assert.equal(context.isOwner, true);
});

test('newsletter post without publisher identity is not granted owner permissions', async () => {
  const f = fixture('ping');
  f.m = normalizeMessage({
    key: { remoteJid: '120363000000000000@newsletter', id: 'newsletter-unknown-post' },
    message: { conversation: '.ping' }
  }, f.client);
  const context = await buildContext({ ...f, config: config(), logger, store: {} });
  assert.equal(context.isNewsletter, true);
  assert.equal(context.sender, '');
  assert.equal(context.isOwner, false);
});

test('newsletter owner is recognized from verified channel metadata when post has no author JID', async () => {
  const f = fixture('ping');
  f.m = normalizeMessage({
    key: { remoteJid: '120363000000000000@newsletter', id: 'newsletter-meta-owner' },
    message: { conversation: '.ping' }
  }, f.client);
  let metadataLookups = 0;
  f.client.newsletterMetadata = async jid => {
    metadataLookups += 1;
    assert.equal(jid, '120363000000000000@newsletter');
    return { id: jid, owner: '6281234567890@s.whatsapp.net', name: 'Owner Channel' };
  };
  const context = await buildContext({ ...f, config: config(), logger, store: {} });
  assert.equal(context.isNewsletter, true);
  assert.equal(context.sender, '');
  assert.equal(context.channelOwner, '6281234567890@s.whatsapp.net');
  assert.equal(context.isOwner, true);
  assert.equal(metadataLookups, 1);

  await buildContext({ ...f, config: config(), logger, store: {} });
  assert.equal(metadataLookups, 1, 'channel owner metadata should be cached');
});

test('newsletter channel owned by a different account does not receive owner permissions', async () => {
  const f = fixture('ping');
  f.m = normalizeMessage({
    key: { remoteJid: '120363000000000000@newsletter', id: 'newsletter-other-owner' },
    message: { conversation: '.ping' }
  }, f.client);
  f.client.newsletterMetadata = async () => ({
    id: '120363000000000000@newsletter',
    owner: '6289999999999@s.whatsapp.net'
  });
  const context = await buildContext({ ...f, config: config(), logger, store: {} });
  assert.equal(context.isOwner, false);
});

test('newsletter owner LID is resolved to configured owner phone identity', async () => {
  const f = fixture('ping');
  f.m = normalizeMessage({
    key: { remoteJid: '120363000000000000@newsletter', id: 'newsletter-lid-owner' },
    message: { conversation: '.ping' }
  }, f.client);
  f.client.newsletterMetadata = async () => ({
    id: '120363000000000000@newsletter',
    owner: '987654321@lid'
  });
  f.client.signalRepository = {
    lidMapping: {
      async getPNForLID(lid) {
        assert.equal(lid, '987654321@lid');
        return '6281234567890@s.whatsapp.net';
      }
    }
  };
  const context = await buildContext({ ...f, config: config(), logger, store: {} });
  assert.equal(context.channelOwner, '6281234567890@s.whatsapp.net');
  assert.equal(context.isOwner, true);
});
