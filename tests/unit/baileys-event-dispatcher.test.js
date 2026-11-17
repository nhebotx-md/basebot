'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createBaileysEventDispatcher, BAILEYS_PLUGIN_EVENTS } = require('../../src/core/events/event-dispatcher');

test('central event dispatcher installs one listener per allowlisted event and dispatches subscribers', async () => {
  const client = { ev: new EventEmitter() };
  const seen = [];
  const dispatcher = { async dispatchEvent(...args) { seen.push(args); } };
  const logger = { info() {}, error() {} };
  const events = createBaileysEventDispatcher({ dispatcher, config: {}, registry: {}, logger });
  const first = events.bind(client);
  const second = events.bind(client);
  assert.equal(first.bound, true);
  assert.equal(first.eventCount, BAILEYS_PLUGIN_EVENTS.length);
  assert.equal(second.bound, false);
  assert.equal(client.ev.listenerCount('messages.reaction'), 1);
  client.ev.emit('messages.reaction', { id: '120363000000000000@g.us', reaction: '❤️' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(seen.length, 1);
  assert.equal(seen[0][0], 'messages.reaction');
  assert.equal(seen[0][1].isGroup, true);
  assert.equal(seen[0][2].reaction, '❤️');
  assert.equal(events.unbind(), BAILEYS_PLUGIN_EVENTS.length);
  assert.equal(client.ev.listenerCount('messages.reaction'), 0);
});

test('central event dispatcher rejects arbitrary event names', () => {
  assert.throws(() => createBaileysEventDispatcher({
    dispatcher: { dispatchEvent() {} },
    events: ['arbitrary.shell.event']
  }), /tidak diizinkan/);
});
