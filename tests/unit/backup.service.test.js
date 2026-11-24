'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { DatabaseService } = require('../../src/core/database/database.service');
const { createBackupService } = require('../../src/core/services/backup.service');

const logger = { info() {}, warn() {}, error() {} };

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'muse-md-backup-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const database = await new DatabaseService({ directory, logger }).init();
  t.after(() => database.close());
  const backups = createBackupService({ database, logger });
  t.after(() => backups.stop());
  return { directory, database, backups };
}

test('backup creates a complete private snapshot and verifies every checksum', async t => {
  const { database, backups } = await fixture(t);
  await database.update('users', users => { users.alpha = { coins: 25 }; });
  const created = await backups.create({ reason: 'unit test' });
  assert.match(created.id, /^backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-f0-9]{8}$/);
  assert.ok(created.bytes > 0);
  const verified = await backups.verify(created.id);
  assert.equal(verified.valid, true);
  assert.equal(verified.files, 4);
  const rows = await backups.list();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, created.id);
  const stat = await fs.stat(path.join(database.backupDirectory, created.id));
  assert.equal(stat.isDirectory(), true);
});

test('restore validates snapshot, creates a safety backup, and restores live memory and files', async t => {
  const { database, backups, directory } = await fixture(t);
  await database.update('users', users => { users.original = { coins: 100 }; });
  const snapshot = await backups.create({ reason: 'known good' });
  await database.update('users', users => { users.original.coins = 5; users.newUser = { coins: 1 }; });
  const result = await backups.restore(snapshot.id);
  assert.equal(result.restored, snapshot.id);
  assert.ok(result.safetyBackup);
  assert.deepEqual(database.read('users'), { original: { coins: 100 } });
  const persisted = JSON.parse(await fs.readFile(path.join(directory, 'users.json'), 'utf8'));
  assert.deepEqual(persisted.data, { original: { coins: 100 } });
  assert.equal((await backups.verify(result.safetyBackup)).valid, true);
});

test('tampered snapshot is rejected before live database is modified', async t => {
  const { database, backups } = await fixture(t);
  await database.update('users', users => { users.keep = { value: true }; });
  const snapshot = await backups.create();
  await fs.writeFile(path.join(database.backupDirectory, snapshot.id, 'users.json'), '{"tampered":true}');
  await assert.rejects(() => backups.verify(snapshot.id), /checksum|ukuran/i);
  await assert.rejects(() => backups.restore(snapshot.id), /checksum|ukuran/i);
  assert.deepEqual(database.read('users'), { keep: { value: true } });
});

test('database restore rejects incomplete or future-schema snapshots without changing data', async t => {
  const { database } = await fixture(t);
  await database.update('users', users => { users.keep = { value: 1 }; });
  assert.throws(() => database.restoreSnapshot({}), /tidak lengkap/i);
  const files = await database.exportSnapshot();
  const future = { ...files, 'users.json': JSON.stringify({ schemaVersion: 999, data: {} }) };
  assert.throws(() => database.restoreSnapshot(future), /skema lebih baru/i);
  assert.deepEqual(database.read('users'), { keep: { value: 1 } });
});

test('snapshot export waits for queued database writes', async t => {
  const { database } = await fixture(t);
  await database.update('groups', groups => { groups.group1 = { enabled: true }; });
  const files = await database.exportSnapshot();
  assert.deepEqual(JSON.parse(files['groups.json']).data, { group1: { enabled: true } });
});


test('owner backup command requires a second restore confirmation and reconciles plugin state', async () => {
  const command = require('../../plugins/owner/database-backup');
  const replies = [];
  const calls = [];
  const ctx = {
    isOwner: true, isNewsletter: false, isChannel: false, prefix: '.',
    services: {
      backups: {
        async verify(id) { calls.push(['verify', id]); return { id, valid: true, createdAt: '2026-11-21T00:00:00.000Z', files: 4 }; },
        async restore(id) { calls.push(['restore', id]); return { restored: id, safetyBackup: 'backup-safety' }; }
      },
      pluginManager: { async restore() { calls.push(['plugin-restore']); return []; } }
    },
    async reply(message) { replies.push(message); }
  };
  await command.execute({ ...ctx, args: ['restore', 'backup-target'] });
  assert.deepEqual(calls, [['verify', 'backup-target']]);
  assert.match(replies.pop(), /backup restore confirm backup-target/);
  await command.execute({ ...ctx, args: ['restore', 'confirm', 'backup-target'] });
  assert.deepEqual(calls.slice(1), [['restore', 'backup-target'], ['plugin-restore']]);
  assert.match(replies.pop(), /backup-safety/);
});

test('owner backup command rejects non-owner before touching backup storage', async () => {
  const command = require('../../plugins/owner/database-backup');
  const replies = [];
  let touched = false;
  await command.execute({
    isOwner: false, isNewsletter: false, isChannel: false, args: ['create'],
    services: { backups: { async create() { touched = true; } } },
    async reply(message) { replies.push(message); }
  });
  assert.equal(touched, false);
  assert.match(replies[0], /khusus owner/);
});


test('startup disaster recovery restores the newest verified snapshot before database init', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'muse-md-recovery-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const original = await new DatabaseService({ directory, logger }).init();
  await original.update('users', users => { users.recoverMe = { coins: 91 }; });
  const originalBackups = createBackupService({ database: original, logger });
  const snapshot = await originalBackups.create({ reason: 'known good recovery point' });
  originalBackups.stop();
  await original.close();

  await fs.writeFile(path.join(directory, 'users.json'), '{"broken":');
  const recoveredDatabase = new DatabaseService({ directory, logger });
  const recoveryService = createBackupService({ database: recoveredDatabase, logger });
  t.after(() => recoveryService.stop());
  const result = await recoveryService.recoverBeforeInit();
  assert.equal(result.action, 'recovered');
  assert.equal(result.snapshotId, snapshot.id);
  await recoveredDatabase.init();
  assert.deepEqual(recoveredDatabase.read('users'), { recoverMe: { coins: 91 } });
  assert.equal(recoveryService.status().recovery.recovered, true);
  assert.ok((await fs.readdir(path.join(directory, 'recovery-quarantine'))).length > 0);
  await recoveredDatabase.close();
});

test('startup recovery treats a genuinely empty database as a fresh install', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'muse-md-fresh-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const database = new DatabaseService({ directory, logger });
  const backups = createBackupService({ database, logger });
  t.after(() => backups.stop());
  assert.deepEqual(await backups.recoverBeforeInit(), { action: 'fresh-install' });
  await database.init();
  assert.deepEqual(database.read('users'), {});
  await database.close();
});

test('startup recovery refuses corrupted data when no verified snapshot exists', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'muse-md-no-recovery-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'meta.json'), '{"schemaVersion":1}');
  await fs.writeFile(path.join(directory, 'users.json'), '{"broken":');
  await fs.writeFile(path.join(directory, 'groups.json'), '{"schemaVersion":1,"data":{}}');
  await fs.writeFile(path.join(directory, 'plugins.json'), '{"schemaVersion":1,"data":{}}');
  const database = new DatabaseService({ directory, logger });
  const backups = createBackupService({ database, logger });
  t.after(() => backups.stop());
  await assert.rejects(() => backups.recoverBeforeInit(), /tidak ada snapshot valid/i);
  assert.equal(database.initialized, false);
});
