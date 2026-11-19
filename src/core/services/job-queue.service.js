'use strict';

const { randomUUID } = require('node:crypto');

function abortError(message = 'Job dibatalkan.') {
  return Object.assign(new Error(message), { code: 'ABORT_ERR' });
}

class JobQueue {
  constructor({ concurrency = 20, maxQueued = 100, clock = Date.now } = {}) {
    this.concurrency = Math.max(1, Math.min(100, Math.floor(Number(concurrency) || 20)));
    this.maxQueued = Math.max(0, Math.min(1000, Math.floor(Number(maxQueued) || 0)));
    this.clock = clock;
    this.queue = [];
    this.active = new Map();
    this.sequence = 0;
    this.closed = false;
    this.completed = 0;
    this.failed = 0;
    this.cancelled = 0;
  }
  get activeCount() { return this.active.size; }
  get pendingCount() { return this.queue.length; }
  isFull() { return this.queue.length >= this.maxQueued && this.active.size >= this.concurrency; }

  add(task, { priority = 0, metadata = {}, signal } = {}) {
    if (typeof task !== 'function') return Promise.reject(new TypeError('Job harus berupa function.'));
    if (this.closed) return Promise.reject(new Error('JobQueue sudah ditutup.'));
    if (signal?.aborted) return Promise.reject(abortError());
    if (this.isFull()) return Promise.reject(Object.assign(new Error('Antrean pekerjaan sedang penuh.'), { code: 'JOB_QUEUE_FULL' }));

    let job;
    const promise = new Promise((resolve, reject) => {
      job = { id: randomUUID(), task, priority: Number.isFinite(Number(priority)) ? Number(priority) : 0,
        sequence: this.sequence++, metadata: { ...metadata }, signal, controller: new AbortController(),
        resolve, reject, status: 'queued', enqueuedAt: this.clock(), abortHandler: null };
      if (signal) {
        job.abortHandler = () => {
          job.controller.abort();
          if (job.status === 'queued') {
            this.queue = this.queue.filter(item => item !== job);
            job.status = 'cancelled';
            this.cancelled += 1;
            reject(abortError('Job dibatalkan sebelum dijalankan.'));
            this._pump();
          }
        };
        signal.addEventListener('abort', job.abortHandler, { once: true });
      }
      this.queue.push(job);
      this.queue.sort((a, b) => b.priority - a.priority || a.sequence - b.sequence);
      this._pump();
    });
    Object.defineProperty(promise, 'jobId', { value: job.id, enumerable: true });
    return promise;
  }

  _pump() {
    while (!this.closed && this.active.size < this.concurrency && this.queue.length) {
      const job = this.queue.shift();
      if (job.signal?.aborted) {
        job.status = 'cancelled';
        this.cancelled += 1;
        job.signal.removeEventListener('abort', job.abortHandler);
        job.reject(abortError());
        continue;
      }
      void this._run(job);
    }
  }

  async _run(job) {
    job.status = 'running';
    job.startedAt = this.clock();
    this.active.set(job.id, job);
    try {
      const result = await job.task({ id: job.id, signal: job.controller.signal, metadata: job.metadata });
      if (job.controller.signal.aborted) throw abortError();
      job.status = 'completed';
      this.completed += 1;
      job.resolve(result);
    } catch (error) {
      job.status = job.controller.signal.aborted || error?.code === 'ABORT_ERR' ? 'cancelled' : 'failed';
      if (job.status === 'cancelled') this.cancelled += 1;
      else this.failed += 1;
      job.reject(error);
    } finally {
      job.finishedAt = this.clock();
      this.active.delete(job.id);
      job.signal?.removeEventListener('abort', job.abortHandler);
      this._pump();
    }
  }

  cancel(id) {
    const queued = this.queue.find(job => job.id === id);
    if (queued) {
      this.queue = this.queue.filter(job => job !== queued);
      queued.status = 'cancelled';
      queued.controller.abort();
      queued.signal?.removeEventListener('abort', queued.abortHandler);
      this.cancelled += 1;
      queued.reject(abortError('Job dibatalkan sebelum dijalankan.'));
      this._pump();
      return true;
    }
    const active = this.active.get(id);
    if (!active) return false;
    active.controller.abort();
    return true;
  }

  stats() {
    return { active: this.active.size, queued: this.queue.length, concurrency: this.concurrency,
      maxQueued: this.maxQueued, completed: this.completed, failed: this.failed,
      cancelled: this.cancelled, closed: this.closed };
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    for (const job of this.queue.splice(0)) {
      job.status = 'cancelled';
      job.controller.abort();
      job.signal?.removeEventListener('abort', job.abortHandler);
      this.cancelled += 1;
      job.reject(abortError('JobQueue ditutup sebelum job dijalankan.'));
    }
    for (const job of this.active.values()) job.controller.abort();
  }
}

module.exports = { JobQueue };
