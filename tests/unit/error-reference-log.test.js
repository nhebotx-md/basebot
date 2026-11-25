'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createLogger, redact } = require('../../src/core/services/logger.service');
const { findErrorByReference, normalizeReference } = require('../../src/core/services/error-log.service');
const { CommandDispatcher } = require('../../src/core/messaging/command-dispatcher');
const logref = require('../../plugins/owner/logref.handler.cjs');

const LONG_MESSAGE = 'TikTok downloader gagal. TikWM: TikWM tidak menemukan media TikTok. | Soclip: SOCLIP_API_KEY belum diatur pada file .env. | provider TikTok cadangan: Provider TikTok lama tidak menemukan media.';

async function makeTempDir(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'muse-md-error-log-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return directory;
}

function makeSink() {
  const lines = [];
  return {
    lines,
    log(line) { lines.push(String(line)); },
    info(line) { lines.push(String(line)); },
    warn(line) { lines.push(String(line)); },
    error(line) { lines.push(String(line)); }
  };
}

test('errorReference stores a searchable plugin-error JSON record with full message', async t => {
  const directory = await makeTempDir(t);
  const sink = makeSink();
  const logger = createLogger({ format: 'json', colors: false, sink, file: { directory, filename: 'muse-md.jsonl' } });
  const error = new Error(LONG_MESSAGE);
  error.providerErrors = ['TikWM: boom', 'Soclip: 401 invalid key'];
  const returned = logger.errorReference({
    reference: '6E397A04', plugin: 'downloader-tiktok', command: 'tiktok',
    stage: 'execute', scope: 'group', error
  });
  assert.equal(returned, '6E397A04');
  await logger.flush();
  const text = await fs.readFile(path.join(directory, 'muse-md.jsonl'), 'utf8');
  const entry = JSON.parse(text.trim().split('\n').pop());
  assert.equal(entry.level, 'ERROR');
  assert.equal(entry.data.kind, 'plugin-error');
  assert.equal(entry.data.reference, '6E397A04');
  assert.equal(entry.data.plugin, 'downloader-tiktok');
  assert.equal(entry.data.command, 'tiktok');
  assert.equal(entry.data.error.message, LONG_MESSAGE);
  assert.deepEqual(entry.data.error.providerErrors, ['TikWM: boom', 'Soclip: 401 invalid key']);
  assert.match(entry.data.error.stack, /Error/);
  await logger.close();
});

test('errorReference shows the full error message on a pretty terminal instead of clipping it', async t => {
  const directory = await makeTempDir(t);
  const sink = makeSink();
  const logger = createLogger({ format: 'pretty', colors: false, sink, file: { directory, filename: 'muse-md.jsonl' } });
  logger.errorReference({ reference: '6E397A04', plugin: 'downloader-tiktok', command: 'tiktok', error: new Error(LONG_MESSAGE) });
  await logger.flush();
  const shown = sink.lines.join(' ').replace(/· [A-Z]+=/g, ' ').replace(/\s+/g, ' ');
  assert.match(shown, /6E397A04/);
  assert.match(shown, /TikWM tidak menemukan media TikTok/);
  assert.match(shown, /SOCLIP_API_KEY belum diatur/);
  assert.doesNotMatch(shown, /metadata fields/);
  await logger.close();
});

test('errorReference rejects invalid references and stays silent below error level', async t => {
  const directory = await makeTempDir(t);
  const sink = makeSink();
  const logger = createLogger({ format: 'json', colors: false, sink, file: { directory, filename: 'muse-md.jsonl' } });
  assert.equal(logger.errorReference({ reference: 'xyz', plugin: 'x', error: new Error('nope') }), null);
  assert.equal(logger.errorReference({ plugin: 'x', error: new Error('nope') }), null);
  const silent = createLogger({ level: 'silent', format: 'json', colors: false, sink, file: { directory, filename: 'other.jsonl' } });
  assert.equal(silent.errorReference({ reference: '6E397A04', plugin: 'x', error: new Error('nope') }), null);
  await logger.close();
  await silent.close();
});

test('redact keeps providerErrors on Error objects', () => {
  const error = new Error('aggregate');
  error.providerErrors = ['TikWM: a', 'Soclip: b'];
  const safe = redact({ error });
  assert.deepEqual(safe.error.providerErrors, ['TikWM: a', 'Soclip: b']);
});

test('findErrorByReference finds entries in the current and rotated log files', async t => {
  const directory = await makeTempDir(t);
  const entry = (reference, plugin) => JSON.stringify({
    timestamp: '2026-11-25T13:40:00.000Z', level: 'ERROR', component: 'MUSE-MD',
    message: 'Plugin gagal saat dieksekusi.',
    data: { kind: 'plugin-error', reference, plugin, command: 'tiktok', stage: 'execute', error: { name: 'Error', message: 'boom ' + reference } }
  });
  await fs.writeFile(path.join(directory, 'muse-md.jsonl'), entry('AAAAAAAA', 'old-plugin') + '\n' + entry('6E397A04', 'downloader-tiktok') + '\n');
  await fs.writeFile(path.join(directory, 'muse-md.jsonl.1'), entry('BBBBBBBB', 'rotated-plugin') + '\n');
  await fs.writeFile(path.join(directory, 'muse-md.jsonl.2'), 'not json {broken\n' + entry('CCCCCCCC', 'broken-prefix-plugin') + '\n');

  const found = await findErrorByReference({ directory, reference: '6e397a04' });
  assert.equal(found.data.plugin, 'downloader-tiktok');
  assert.equal(found.data.error.message, 'boom 6E397A04');
  const rotated = await findErrorByReference({ directory, reference: 'BBBBBBBB' });
  assert.equal(rotated.data.plugin, 'rotated-plugin');
  const afterBroken = await findErrorByReference({ directory, reference: 'CCCCCCCC' });
  assert.equal(afterBroken.data.plugin, 'broken-prefix-plugin');
  assert.equal(await findErrorByReference({ directory, reference: 'DDDDDDDD' }), null);
  assert.throws(() => normalizeReference('not-a-ref'), /heksadesimal/);
});

test('dispatcher routes plugin failures to errorReference when available', async () => {
  const registry = {
    getByCommand: () => ({ name: 'downloader-tiktok', category: 'downloader', commands: ['tiktok'], execute: async () => { throw new Error('controlled failure'); } }),
    list: () => []
  };
  const refs = [];
  const logger = {
    info() {}, warn() {}, debug() {},
    errorReference(details) { refs.push(details); return details.reference; },
    error() { throw new Error('fallback error logger should not run'); }
  };
  const dispatcher = new CommandDispatcher({ registry, logger, rateLimit: 0 });
  const ctx = { m: { id: 'error-ref-test' }, command: 'tiktok', prefix: '.', isOwner: false, isGroup: true, isPrivate: false, profile: { registered: true }, publicMode: true, reply: async () => {} };
  const result = await dispatcher.dispatch(ctx);
  assert.equal(refs.length, 1);
  assert.equal(refs[0].reference, result.reference);
  assert.equal(refs[0].plugin, 'downloader-tiktok');
  assert.equal(refs[0].stage, 'execute');
  assert.equal(refs[0].scope, 'group');
  assert.match(refs[0].error.message, /controlled failure/);
});

test('dispatcher falls back to logger.error when errorReference is missing', async () => {
  const registry = {
    getByCommand: () => ({ name: 'downloader-tiktok', category: 'downloader', commands: ['tiktok'], execute: async () => { throw new Error('controlled failure'); } }),
    list: () => []
  };
  const errors = [];
  const logger = { info() {}, warn() {}, debug() {}, error(message, meta) { errors.push({ message, meta }); } };
  const dispatcher = new CommandDispatcher({ registry, logger, rateLimit: 0 });
  const ctx = { m: { id: 'error-ref-fallback-test' }, command: 'tiktok', prefix: '.', isOwner: false, isGroup: false, isPrivate: true, publicMode: true, reply: async () => {} };
  const result = await dispatcher.dispatch(ctx);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].meta.reference, result.reference);
});

test('logref plugin returns the stored error for owners and guards everything else', async t => {
  const directory = await makeTempDir(t);
  const entry = JSON.stringify({
    timestamp: '2026-11-25T13:40:00.000Z', level: 'ERROR', component: 'MUSE-MD',
    message: 'Plugin gagal saat dieksekusi.',
    data: { kind: 'plugin-error', reference: '6E397A04', plugin: 'downloader-tiktok', command: 'tiktok', stage: 'execute', error: { name: 'Error', message: LONG_MESSAGE, providerErrors: ['TikWM: boom'] } }
  });
  await fs.writeFile(path.join(directory, 'muse-md.jsonl'), entry + '\n');
  const config = { paths: { logs: directory }, logging: { fileName: 'muse-md.jsonl' } };
  const replies = [];
  const base = { prefix: '.', config, reply: async text => replies.push(text) };

  await logref.execute({ ...base, isOwner: false, args: ['6E397A04'] });
  assert.match(replies.pop(), /khusus owner/);
  await logref.execute({ ...base, isOwner: true, args: [] });
  assert.match(replies.pop(), /\.logref <REF>/);
  await logref.execute({ ...base, isOwner: true, args: ['xyz'] });
  assert.match(replies.pop(), /heksadesimal/);
  await logref.execute({ ...base, isOwner: true, args: ['DDDDDDDD'] });
  assert.match(replies.pop(), /tidak ditemukan/);
  await logref.execute({ ...base, isOwner: true, args: ['6e397a04'] });
  const found = replies.pop();
  assert.match(found, /LOG ERROR 6E397A04/);
  assert.match(found, /downloader-tiktok/);
  assert.match(found, /TikWM: boom/);
  assert.match(found, /SOCLIP_API_KEY belum diatur/);
});
