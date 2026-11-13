'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { Readable } = require('node:stream');
const { createClientFactory, securePrivateDirectory } = require('../../src/integrations/whatsapp/client');
const legacyClientFactory = require('../../src/core/client/create-client');
const { createPairingManager } = require('../../src/core/connection/pairing-manager');

test('client factory serializes async credential writes and exposes a flush barrier', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'basebot-client-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  assert.equal(legacyClientFactory.createClientFactory, createClientFactory);
  const state = { creds: { registered: true }, keys: {} };
  const saved = [];
  let activeSaves = 0;
  let maxActiveSaves = 0;
  let options;
  const baileys = {
    DisconnectReason: { loggedOut: 401, restartRequired: 515 },
    async useMultiFileAuthState() {
      return {
        state,
        async saveCreds(update) {
          activeSaves += 1;
          maxActiveSaves = Math.max(maxActiveSaves, activeSaves);
          await new Promise(resolve => setTimeout(resolve, 5));
          saved.push(update.id);
          activeSaves -= 1;
        }
      };
    },
    makeWASocket(input) { options = input; return { ev: new EventEmitter(), sendMessage: async () => {}, end() {} }; },
    jidDecode(value) { return { user: value.split('@')[0].split(':')[0], server: value.split('@')[1] }; },
    async downloadContentFromMessage() { return Readable.from([Buffer.from('media')]); }
  };
  let pinoOptions;
  const createClient = createClientFactory({
    config: { paths: { session: path.join(root, 'session'), temp: path.join(root, 'temp') }, logging: { baileysLevel: 'warn' } },
    logger: { info() {}, debug() {}, warn() {}, error() {} },
    dependencies: { baileys, pino(input) { pinoOptions = input; return { level: input.level }; } }
  });
  const client = await createClient();
  assert.equal(client.authState, state);
  assert.deepEqual(client.lifecycleReasons, { loggedOut: 401, restartRequired: 515 });
  assert.equal(options.printQRInTerminal, false);
  assert.equal(pinoOptions.level, 'warn');
  client.ev.emit('creds.update', { id: 'first' });
  client.ev.emit('creds.update', { id: 'second' });
  await client.waitForCredentialPersistence();
  assert.deepEqual(saved, ['first', 'second']);
  assert.equal(maxActiveSaves, 1);
  assert.equal(await client.downloadMediaMessage({ mimetype: 'image/png', mtype: 'imageMessage' }).then(value => value.toString()), 'media');
});

test('pairing manager ignores fixed custom codes and does not expose generated codes in logs', async () => {
  const logs = []; let written = ''; let calls = [];
  const logger = { info(...args) { logs.push(args); }, debug() {}, warn(...args) { logs.push(args); }, error(...args) { logs.push(args); } };
  const manager = createPairingManager({
    config: { pairing: { phone: '+6281234567890', code: 'SHONNHEE', delayMs: 0 } },
    logger,
    output: { write(value) { written += value; } }
  });
  const client = {
    authState: { creds: { registered: false } },
    async requestPairingCode(...args) { calls.push(args); return 'SAFE1234'; }
  };
  await manager.onSocketReady(client);
  assert.deepEqual(calls, [['6281234567890']]);
  assert.match(written, /SAFE1234/);
  assert.equal(JSON.stringify(logs).includes('SAFE1234'), false);
  assert.equal(JSON.stringify(logs).includes('SHONNHEE'), false);
  await manager.onSocketReady({ authState: { creds: { registered: true } }, requestPairingCode() { throw new Error('must not call'); } });
  assert.equal(calls.length, 1);
});

test('existing auth directory and files are tightened and symlink roots are rejected', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'basebot-auth-permissions-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const auth = path.join(root, 'auth');
  fsSync.mkdirSync(auth, { mode: 0o777 });
  const credential = path.join(auth, 'creds.json');
  fsSync.writeFileSync(credential, '{}', { mode: 0o644 });
  securePrivateDirectory(auth);
  assert.equal((fsSync.statSync(auth).mode & 0o777), 0o700);
  assert.equal((fsSync.statSync(credential).mode & 0o777), 0o600);
  const alias = path.join(root, 'alias');
  fsSync.symlinkSync(auth, alias);
  assert.throws(() => securePrivateDirectory(alias), /symlink/i);
});

test('Baileys Pino logger redacts account identity at info level', async t => {
  const { Writable } = require('node:stream');
  const realPino = require('pino');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'basebot-pino-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const lines = [];
  const destination = new Writable({ write(chunk, encoding, callback) { lines.push(chunk.toString()); callback(); } });
  const pinoFactory = options => realPino(options, destination);
  pinoFactory.stdTimeFunctions = realPino.stdTimeFunctions;
  let baileysLogger;
  const baileys = {
    DisconnectReason: { loggedOut: 401, restartRequired: 515 },
    async useMultiFileAuthState() { return { state: { creds: { registered: true }, keys: {} }, async saveCreds() {} }; },
    makeWASocket(options) { baileysLogger = options.logger; return { ev: new EventEmitter(), end() {} }; },
    jidDecode() { return null; },
    async downloadContentFromMessage() { return Readable.from([]); }
  };
  const createClient = createClientFactory({
    config: { paths: { session: path.join(root, 'session'), temp: path.join(root, 'temp') }, logging: { baileysLevel: 'info' } },
    logger: { info() {}, debug() {}, warn() {}, error() {} },
    dependencies: { baileys, pino: pinoFactory }
  });
  await createClient();
  baileysLogger.info({ me: { id: '6281234567890@s.whatsapp.net', name: 'private-account-name' }, phoneNumber: '6281234567890', platform: 'ubuntu' }, 'pairing confirmed');
  await new Promise(resolve => setImmediate(resolve));
  const record = JSON.parse(lines[0]);
  assert.equal(record.me, '[REDACTED]');
  assert.equal(record.phoneNumber, '[REDACTED]');
  assert.equal(record.platform, 'ubuntu');
  assert.doesNotMatch(lines.join(''), /6281234567890|private-account-name/);
});
