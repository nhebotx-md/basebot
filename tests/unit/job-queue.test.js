'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { JobQueue } = require('../../src/core/services/job-queue.service');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

test('queue enforces concurrency and completes jobs', async () => {
  const queue = new JobQueue({ concurrency: 2, maxQueued: 10 });
  let active = 0, peak = 0;
  const jobs = Array.from({ length: 6 }, () => queue.add(async () => {
    active += 1; peak = Math.max(peak, active); await delay(10); active -= 1; return true;
  }));
  assert.deepEqual(await Promise.all(jobs), Array(6).fill(true));
  assert.equal(peak, 2);
  assert.equal(queue.stats().completed, 6);
  queue.close();
});

test('queue rejects when running and waiting capacity are full', async () => {
  const queue = new JobQueue({ concurrency: 1, maxQueued: 1 });
  let release;
  const blocker = queue.add(() => new Promise(resolve => { release = resolve; }));
  await new Promise(resolve => setImmediate(resolve));
  const waiting = queue.add(async () => 'queued');
  await assert.rejects(queue.add(async () => 'overflow'), error => error.code === 'JOB_QUEUE_FULL');
  release('done');
  assert.equal(await blocker, 'done');
  assert.equal(await waiting, 'queued');
  queue.close();
});

test('queue orders priority and supports queued cancellation', async () => {
  const queue = new JobQueue({ concurrency: 1, maxQueued: 4 });
  let release;
  const first = queue.add(() => new Promise(resolve => { release = resolve; }));
  await new Promise(resolve => setImmediate(resolve));
  const order = [];
  const low = queue.add(async () => { order.push('low'); });
  const high = queue.add(async () => { order.push('high'); }, { priority: 10 });
  const cancelled = queue.add(async () => { order.push('cancelled'); });
  assert.equal(queue.cancel(cancelled.jobId), true);
  await assert.rejects(cancelled, error => error.code === 'ABORT_ERR');
  release('done');
  await Promise.all([first, low, high]);
  assert.deepEqual(order, ['high', 'low']);
  queue.close();
});

test('queue shutdown rejects pending jobs and aborts active work', async () => {
  const queue = new JobQueue({ concurrency: 1, maxQueued: 2 });
  let signal;
  const active = queue.add(({ signal: current }) => new Promise(resolve => { signal = current; setTimeout(resolve, 20); }));
  await new Promise(resolve => setImmediate(resolve));
  const pending = queue.add(async () => true);
  queue.close();
  await assert.rejects(pending, error => error.code === 'ABORT_ERR');
  assert.equal(signal.aborted, true);
  await assert.rejects(active, error => error.code === 'ABORT_ERR');
});
