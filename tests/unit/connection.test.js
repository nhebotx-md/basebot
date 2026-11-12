'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createConnectionManager } = require('../../src/core/connection/connection-manager');

const logger = { info() {}, debug() {}, warn() {}, error() {} };
const config = { pairing: { phone: '', code: '' }, publicMode: true };
const registry = { list() { return []; } };
const dispatcher = { async dispatch() {}, async dispatchEvent() {} };
const waitUntil = async predicate => {
  const deadline = Date.now() + 1500;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error('Kondisi tes tidak tercapai sebelum timeout.');
    await new Promise(resolve => setTimeout(resolve, 5));
  }
};

function createManager(createClient, options = {}) {
  return createConnectionManager({ config, registry, dispatcher, logger, createClient, ...options });
}

function fakeClient() { return { ev: new EventEmitter(), end() {} }; }

test('connection manager shares a single in-flight socket initialization', async () => {
  let created = 0;
  const manager = createManager(async () => { created += 1; await new Promise(resolve => setTimeout(resolve, 10)); return fakeClient(); });
  const [first, second] = await Promise.all([manager.start(), manager.start()]);
  assert.equal(created, 1);
  assert.equal(first, second);
  await manager.stop();
});

test('connection manager reconnects after transient close and does not reconnect after logout', async () => {
  const baileys = await import('@itsliaaa/baileys');
  let created = 0;
  const transient = createManager(async () => { created += 1; return fakeClient(); });
  const first = await transient.start();
  first.ev.emit('connection.update', { connection: 'close', lastDisconnect: { error: { output: { statusCode: 503 } } } });
  await new Promise(resolve => setTimeout(resolve, 1200));
  assert.equal(created, 2);
  await transient.stop();

  created = 0;
  const loggedOut = createManager(async () => { created += 1; return fakeClient(); });
  const session = await loggedOut.start();
  session.ev.emit('connection.update', { connection: 'close', lastDisconnect: { error: { output: { statusCode: baileys.DisconnectReason.loggedOut } } } });
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(created, 1);
  assert.equal(loggedOut.client, null);
  await loggedOut.stop();
});

test('restartRequired 515 waits for auth persistence and immediately creates a fresh socket without unref', async () => {
  const baileys = await import('@itsliaaa/baileys');
  let created = 0;
  const timers = [];
  const timerApi = {
    setTimeout(callback, delayMs) {
      const timer = { callback, delayMs, unreferenced: false, unref() { this.unreferenced = true; } };
      timers.push(timer);
      return timer;
    },
    clearTimeout(timer) { timer.cleared = true; }
  };
  const manager = createManager(async () => { created += 1; return fakeClient(); }, { timerApi });
  const first = await manager.start();
  first.authState = { creds: { registered: true } };
  let credentialsFlushed = false;
  first.waitForCredentialPersistence = async () => { await new Promise(resolve => setTimeout(resolve, 10)); credentialsFlushed = true; };
  first.ev.emit('connection.update', { connection: 'close', lastDisconnect: { error: { output: { statusCode: baileys.DisconnectReason.restartRequired, message: 'Stream Errored (restart required)' } } } });
  await waitUntil(() => timers.length === 1);
  assert.equal(credentialsFlushed, true);
  assert.equal(timers[0].delayMs, 0);
  assert.equal(timers[0].unreferenced, false);
  timers[0].callback();
  await waitUntil(() => created === 2);
  assert.equal(manager.client !== null, true);
  await manager.stop();
});

test('shutdown waits for auth persistence before ending the socket', async () => {
  let resolvePersistence;
  let ended = false;
  const client = {
    ev: new EventEmitter(),
    waitForCredentialPersistence: () => new Promise(resolve => { resolvePersistence = resolve; }),
    end() { ended = true; }
  };
  const manager = createManager(async () => client);
  await manager.start();
  const stopping = manager.stop();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(ended, false);
  resolvePersistence();
  await stopping;
  assert.equal(ended, true);
});

test('CLI process remains alive until the reconnect timer creates the next socket', () => {
  const { spawnSync } = require('node:child_process');
  const script = String.raw`
    const { EventEmitter } = require('node:events');
    const { createConnectionManager } = require('./src/core/connection/connection-manager');
    const logger = { info() {}, debug() {}, warn() {}, error() {} };
    let sockets = 0;
    const manager = createConnectionManager({
      config: { pairing: { phone: '', code: '' }, publicMode: true },
      registry: { list() { return []; } },
      dispatcher: { async dispatch() {}, async dispatchEvent() {} }, logger,
      async createClient() {
        sockets += 1;
        if (sockets === 2) process.stdout.write('SECOND_SOCKET_CREATED\\n');
        return { ev: new EventEmitter(), authState: { creds: { registered: true } }, async waitForCredentialPersistence() {}, end() {} };
      }
    });
    (async () => {
      const first = await manager.start();
      first.ev.emit('connection.update', { connection: 'close', lastDisconnect: { error: { output: { statusCode: 515 } } } });
    })();
  `;
  const child = spawnSync(process.execPath, ['-e', script], { cwd: process.cwd(), encoding: 'utf8', timeout: 5000 });
  assert.equal(child.error, undefined, child.error?.message);
  assert.equal(child.status, 0, child.stderr);
  assert.match(child.stdout, /SECOND_SOCKET_CREATED/);
});

test('pairing callback failures are logged instead of becoming unhandled rejections', async () => {
  const messages = [];
  const testLogger = {
    info() {}, debug() {}, warn() {},
    error(...args) { messages.push(args); }
  };
  const manager = createConnectionManager({
    config: { pairing: { phone: 'not-a-phone', code: '' }, publicMode: true },
    registry, dispatcher, logger: testLogger,
    async createClient() {
      return { ev: new EventEmitter(), authState: { creds: { registered: false } }, end() {} };
    }
  });
  const client = await manager.start();
  client.ev.emit('connection.update', { qr: 'private-qr-payload' });
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(messages.some(([message]) => message === 'Inisialisasi pairing gagal.'));
  await manager.stop();
});
