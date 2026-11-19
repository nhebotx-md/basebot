'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createLogger } = require('../../src/core/services/logger.service');

test('message terminal panel never prints contact or group names', () => {
  const lines = [];
  const sink = {
    log(line) { lines.push(String(line)); },
    info(line) { lines.push(String(line)); },
    warn(line) { lines.push(String(line)); },
    error(line) { lines.push(String(line)); }
  };
  const logger = createLogger({ level: 'info', format: 'pretty', colors: false, sink });
  logger.message({
    chatType: 'private',
    pushName: 'PRIVATE_CONTACT_NAME',
    groupName: 'CONFIDENTIAL_GROUP_NAME',
    messageType: 'conversation',
    hasText: true
  });
  const output = lines.join('\n');
  assert.match(output, /Private message/);
  assert.doesNotMatch(output, /PRIVATE_CONTACT_NAME|CONFIDENTIAL_GROUP_NAME/);
});

test('file logger writes sanitized JSONL records and rotates within retention limits', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'basebot-log-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const logger = createLogger({
    level: 'debug',
    format: 'json',
    sink: { log() {}, info() {}, warn() {}, error() {}, debug() {} },
    file: { directory, filename: 'basebot.jsonl', maxBytes: 240, maxFiles: 3 }
  });

  logger.info('safe event', { token: 'never-write-this', phone: '6281234567890', status: 'connected' });
  logger.warn('provider warning', { apiKey: 'also-secret', retry: 2 });
  logger.error('provider failed', { error: new Error('Authorization: Bearer private-token') });
  logger.info('runtime restored', { status: 'healthy' });
  await logger.close();

  const names = (await fs.readdir(directory)).filter(name => name.startsWith('basebot.jsonl')).sort();
  assert.ok(names.length >= 2, 'expected at least one rotated file');
  assert.ok(names.length <= 3, 'retention must cap active plus rotated files');
  const contents = await Promise.all(names.map(name => fs.readFile(path.join(directory, name), 'utf8')));
  const combined = contents.join('\n');
  assert.doesNotMatch(combined, /never-write-this|also-secret|private-token|6281234567890/);
  for (const content of contents) {
    for (const line of content.split(/\r?\n/).filter(Boolean)) {
      const record = JSON.parse(line);
      assert.ok(record.timestamp);
      assert.ok(record.level);
      assert.ok(record.message);
    }
  }
  const activeStat = await fs.stat(path.join(directory, 'basebot.jsonl'));
  assert.equal(activeStat.mode & 0o077, 0, 'active log file must not be group/world readable');
  assert.equal(logger.fileStatus().closed, true);
});

test('file logger can be disabled without changing terminal JSON logging', async () => {
  const lines = [];
  const logger = createLogger({ format: 'json', sink: { info(line) { lines.push(line); } }, file: null });
  logger.info('console only');
  assert.equal(JSON.parse(lines[0]).message, 'console only');
  assert.deepEqual(logger.fileStatus(), { enabled: false, closed: true });
  await logger.close();
});
