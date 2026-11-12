'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createConnectionManager } = require('../../src/core/connection/connection-manager');

test('connection manager shares a single in-flight socket initialization', async () => {
  let created = 0;
  const logger = { info() {}, debug() {}, warn() {}, error() {} };
  const manager = createConnectionManager({ config: { pairing: { phone: '', code: '' }, publicMode: true }, registry: { list() { return []; } }, dispatcher: { async dispatch() {}, async dispatchEvent() {} }, logger, async createClient() { created += 1; await new Promise(resolve => setTimeout(resolve, 10)); return { ev: new EventEmitter(), end() {} }; } });
  const [first, second] = await Promise.all([manager.start(), manager.start()]);
  assert.equal(created, 1);
  assert.equal(first, second);
  await manager.stop();
});

test('connection manager reconnects after transient close and does not reconnect after logout', async () => {
  const baileys = await import('@itsliaaa/baileys');
  const logger = { info() {}, debug() {}, warn() {}, error() {} };
  const createManager = createClient => createConnectionManager({ config: { pairing: { phone: '', code: '' }, publicMode: true }, registry: { list() { return []; } }, dispatcher: { async dispatch() {}, async dispatchEvent() {} }, logger, createClient });
  let created = 0;
  const makeClient = () => ({ ev: new EventEmitter(), end() {} });
  const transient = createManager(async () => { created += 1; return makeClient(); });
  const first = await transient.start();
  first.ev.emit('connection.update', { connection: 'close', lastDisconnect: { error: { output: { statusCode: 503 } } } });
  await new Promise(resolve => setTimeout(resolve, 1200));
  assert.equal(created, 2);
  await transient.stop();

  created = 0;
  const loggedOut = createManager(async () => { created += 1; return makeClient(); });
  const session = await loggedOut.start();
  session.ev.emit('connection.update', { connection: 'close', lastDisconnect: { error: { output: { statusCode: baileys.DisconnectReason.loggedOut } } } });
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(created, 1);
  assert.equal(loggedOut.client, null);
  await loggedOut.stop();
});
