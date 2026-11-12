'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { Readable } = require('node:stream');
const { createClientFactory, securePrivateDirectory } = require('../../src/core/client/create-client');
const { createPairingManager } = require('../../src/core/connection/pairing-manager');

test('client factory retains Baileys auth state and persists credentials', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'basebot-client-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const state = { creds: { registered: true }, keys: {} };
  let saved = 0; let options;
  const baileys = {
    async useMultiFileAuthState() { return { state, saveCreds: async () => { saved += 1; } }; },
    makeWASocket(input) { options = input; return { ev: new EventEmitter(), sendMessage: async () => {}, end() {} }; },
    jidDecode(value) { return { user: value.split('@')[0].split(':')[0], server: value.split('@')[1] }; },
    async downloadContentFromMessage() { return Readable.from([Buffer.from('media')]); }
  };
  const createClient = createClientFactory({ config: { paths: { session: path.join(root, 'session'), temp: path.join(root, 'temp') } }, logger: { info() {} }, dependencies: { baileys, pino: () => ({ level: 'silent' }) } });
  const client = await createClient();
  assert.equal(client.authState, state);
  assert.equal(options.printQRInTerminal, false);
  await client.ev.emit('creds.update', {});
  assert.equal(saved, 1);
  assert.equal(await client.downloadMediaMessage({ mimetype: 'image/png', mtype: 'imageMessage' }).then(value => value.toString()), 'media');
});

test('pairing manager does not expose pairing code in logs and skips registered sessions', async () => {
  const logs = []; let written = ''; let called = 0;
  const logger = { info() {}, debug() {}, warn(...args) { logs.push(args); }, error(...args) { logs.push(args); } };
  const manager = createPairingManager({ config: { pairing: { phone: '+6281234567890', code: 'ABCD1234', delayMs: 0 } }, logger, output: { write(value) { written += value; } } });
  const client = { authState: { creds: { registered: false } }, async requestPairingCode(phone, custom) { called += 1; assert.equal(phone, '6281234567890'); assert.equal(custom, 'ABCD1234'); return 'SAFE1234'; } };
  await manager.onSocketReady(client);
  assert.match(written, /SAFE1234/);
  assert.equal(JSON.stringify(logs).includes('SAFE1234'), false);
  await manager.onSocketReady({ authState: { creds: { registered: true } }, requestPairingCode() { throw new Error('must not call'); } });
  assert.equal(called, 1);
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
