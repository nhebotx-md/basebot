'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CommandDispatcher } = require('../../src/core/messaging/command-dispatcher');

function createContext() {
  return {
    m: { id: 'correlation-test-message' },
    command: 'ping',
    prefix: '.',
    isOwner: false,
    isGroup: false,
    isPrivate: true,
    isGroupAdmin: false,
    isBotAdmin: false,
    isRegistered: true,
    publicMode: true,
    reply: async () => {}
  };
}

function createRegistry(execute) {
  const plugin = {
    name: 'ping-plugin',
    category: 'utility',
    commands: ['ping'],
    description: 'Correlation test plugin',
    usage: '.ping',
    execute
  };
  return { getByCommand: command => command === 'ping' ? plugin : null, list: () => [plugin] };
}

test('successful command keeps one correlation reference in context, activity and result', async () => {
  const activities = [];
  const logger = { info() {}, warn() {}, error() {}, debug() {}, activity(entry) { activities.push(entry); } };
  const dispatcher = new CommandDispatcher({ registry: createRegistry(async () => {}), logger, rateLimit: 0 });
  const ctx = createContext();
  const result = await dispatcher.dispatch(ctx);

  assert.match(ctx.traceId, /^[A-F0-9]{8}$/);
  assert.equal(result.reference, ctx.traceId);
  assert.equal(activities.length, 1);
  assert.equal(activities[0].reference, ctx.traceId);
  assert.equal(activities[0].command, 'ping');
});

test('plugin failure uses the same correlation reference in logs and user report', async () => {
  const errors = [];
  const replies = [];
  const logger = { info() {}, warn() {}, debug() {}, activity() {}, error(message, meta) { errors.push({ message, meta }); } };
  const dispatcher = new CommandDispatcher({
    registry: createRegistry(async () => { throw new Error('controlled failure'); }),
    logger,
    rateLimit: 0
  });
  const ctx = createContext();
  ctx.reply = async value => replies.push(value);
  const result = await dispatcher.dispatch(ctx);

  assert.equal(result.reference, ctx.traceId);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].meta.reference, ctx.traceId);
  assert.match(replies[0], new RegExp(ctx.traceId));
});
