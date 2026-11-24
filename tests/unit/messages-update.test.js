'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createMessagesUpdateHandler } = require('../../src/core/events/messages-update');

test('messages update handler dispatches Baileys poll updates with minimal context', async () => {
  const seen = [];
  const client = { user: { id: '628123@s.whatsapp.net' } };
  const config = { botName: 'MUSE-MD' };
  const registry = { name: 'registry' };
  const logger = { info() {} };
  const dispatcher = { async dispatchEvent(...args) { seen.push(args); } };
  const handler = createMessagesUpdateHandler({ dispatcher, client, config, registry, logger });
  const update = [{ key: { id: 'poll-id' }, update: { pollUpdates: [] } }];

  await handler(update);

  assert.equal(seen.length, 1);
  assert.equal(seen[0][0], 'messages.update');
  assert.equal(seen[0][1].client, client);
  assert.equal(seen[0][1].sock, client);
  assert.equal(seen[0][1].config, config);
  assert.equal(seen[0][1].registry, registry);
  assert.equal(seen[0][2], update);
});
