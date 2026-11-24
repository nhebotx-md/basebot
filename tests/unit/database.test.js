'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { DatabaseService } = require('../../src/core/database/database.service');
const { UserService, levelForExp } = require('../../src/core/database/user.service');
const { GroupService } = require('../../src/core/database/group.service');
const { PluginStateRepository } = require('../../src/core/database/plugin-state.repository');

const logger = { info() {}, warn() {}, error() {} };

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'muse-md-json-db-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const database = await new DatabaseService({ directory, logger }).init();
  t.after(() => database.close());
  return { directory, database };
}

test('database initializes versioned JSON collections and survives restart', async t => {
  const { directory, database } = await fixture(t);
  await database.update('users', users => { users.user1 = { exp: 25 }; });
  await database.flush();
  const file = JSON.parse(await fs.readFile(path.join(directory, 'users.json'), 'utf8'));
  assert.equal(file.schemaVersion, 1);
  assert.equal(file.data.user1.exp, 25);
  const restarted = await new DatabaseService({ directory, logger }).init();
  assert.equal(restarted.read('users').user1.exp, 25);
  await restarted.close();
});

test('database serializes concurrent updates without losing data', async t => {
  const { database } = await fixture(t);
  await Promise.all(Array.from({ length: 40 }, () => database.update('users', users => {
    users.counter = (users.counter || 0) + 1;
  })));
  assert.equal(database.read('users').counter, 40);
});

test('legacy plain JSON data is migrated to the current schema', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'muse-md-json-migration-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'users.json'), JSON.stringify({ legacyUser: { exp: 10 } }));
  const database = await new DatabaseService({ directory, logger }).init();
  assert.equal(database.read('users').legacyUser.exp, 10);
  const saved = JSON.parse(await fs.readFile(path.join(directory, 'users.json'), 'utf8'));
  assert.equal(saved.schemaVersion, 1);
  await database.close();
});

test('user service records messages, cooldown EXP, commands, levels and coin transactions', async t => {
  const { database } = await fixture(t);
  let now = 100000;
  const users = new UserService({ database, expPerMessage: 5, expCooldownMs: 60000, clock: () => now });
  await users.recordMessage('user1', { name: 'Test' });
  await users.recordMessage('user1', { name: 'Test' });
  let profile = await users.getProfile('user1');
  assert.equal(profile.stats.messages, 2);
  assert.equal(profile.exp, 5);
  await users.recordCommand('user1');
  await users.addExp('user1', 95);
  profile = await users.addCoins('user1', 50);
  assert.equal(profile.level, 2);
  assert.equal(profile.coins, 50);
  assert.equal((await users.spendCoins('user1', 20)).balance, 30);
  assert.equal((await users.spendCoins('user1', 99)).reason, 'insufficient-funds');
  now += 60001;
  profile = await users.recordMessage('user1');
  assert.equal(profile.exp, 105);
  assert.equal(profile.stats.commands, 1);
});

test('group service persists group settings and message statistics', async t => {
  const { database } = await fixture(t);
  const groups = new GroupService({ database, clock: () => 1000 });
  await groups.recordMessage('group@g.us', { subject: 'Test Group' });
  await groups.updateSettings('group@g.us', { antiLink: true });
  const group = await groups.getGroup('group@g.us');
  assert.equal(group.subject, 'Test Group');
  assert.equal(group.stats.messages, 1);
  assert.equal(group.settings.antiLink, true);
});

test('plugin state repository keeps disabled plugin names', async t => {
  const { database } = await fixture(t);
  const repository = new PluginStateRepository({ database });
  await repository.setEnabled('alpha', false);
  assert.deepEqual(await repository.getDisabledPlugins(), ['alpha']);
  await repository.setEnabled('alpha', true);
  assert.deepEqual(await repository.getDisabledPlugins(), []);
});

test('corrupted collection recovers from the last atomic backup', async t => {
  const { directory, database } = await fixture(t);
  await database.update('users', users => { users.restoreCheck = { value: 1 }; });
  await database.update('users', users => { users.restoreCheck = { value: 2 }; });
  await database.close();
  await fs.writeFile(path.join(directory, 'users.json'), '{ invalid json');
  const recovered = await new DatabaseService({ directory, logger }).init();
  assert.equal(recovered.read('users').restoreCheck.value, 1);
  await recovered.close();
});

test('level calculation is deterministic and non-negative', () => {
  assert.equal(levelForExp(0), 1);
  assert.equal(levelForExp(100), 2);
  assert.equal(levelForExp(400), 3);
});

test('user registration, role upgrades and explicit access grants persist in JSON database', async t => {
  const { database } = await fixture(t);
  const users = new UserService({ database, clock: () => 2000 });
  await users.recordMessage('628111@s.whatsapp.net', { name: 'Calon User' });
  assert.equal((await users.getProfile('628111@s.whatsapp.net')).registered, false);
  const registered = await users.register('628111@s.whatsapp.net', 'Nama User');
  assert.equal(registered.created, true);
  assert.equal(registered.profile.registered, true);
  assert.equal(registered.profile.role, 'user');
  assert.equal((await users.register('628111@s.whatsapp.net', 'Nama User')).created, false);
  const upgraded = await users.setRole('628111@s.whatsapp.net', 'premium');
  assert.equal(upgraded.role, 'premium');
  const granted = await users.grantAccess('628111@s.whatsapp.net', 'command', 'special');
  assert.deepEqual(granted.access.commands, ['special']);
  const categoryGrant = await users.grantAccess('628111@s.whatsapp.net', 'category', 'media');
  assert.deepEqual(categoryGrant.access.categories, ['media']);
  const revoked = await users.revokeAccess('628111@s.whatsapp.net', 'command', 'special');
  assert.deepEqual(revoked.access.commands, []);
  assert.equal((await users.getProfile('628111@s.whatsapp.net')).role, 'premium');
  await assert.rejects(() => users.setRole('missing@s.whatsapp.net', 'owner'), /Role harus/);
});
