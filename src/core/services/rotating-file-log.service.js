'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

class RotatingFileLog {
  constructor({ directory = './logs', filename = 'muse-md.jsonl', maxBytes = 5 * 1024 * 1024, maxFiles = 5, maxPendingWrites = 2000 } = {}) {
    if (typeof filename !== 'string' || !/^[a-zA-Z0-9._-]{1,64}$/.test(filename) || filename === '.' || filename === '..') {
      throw new TypeError('Nama file log tidak valid.');
    }
    this.directory = path.resolve(directory);
    this.filePath = path.join(this.directory, filename);
    this.maxBytes = Math.max(128, Number(maxBytes) || 5 * 1024 * 1024);
    this.maxFiles = Math.max(2, Math.min(20, Math.floor(Number(maxFiles) || 5)));
    this.maxPendingWrites = Math.max(10, Math.floor(Number(maxPendingWrites) || 2000));
    this.bytes = 0;
    this.pending = 0;
    this.dropped = 0;
    this.failedWrites = 0;
    this.lastError = null;
    this.ready = false;
    this.enabled = true;
    this.closed = false;
    this.reportedError = false;
    this.queue = Promise.resolve();
  }

  write(entry) {
    if (!this.enabled || this.closed) return false;
    let line;
    try { line = JSON.stringify(entry) + '\n'; }
    catch { line = JSON.stringify({ level: 'ERROR', message: 'Log entry tidak dapat diserialisasi.' }) + '\n'; }
    if (this.pending >= this.maxPendingWrites) {
      this.dropped += 1;
      return false;
    }

    this.pending += 1;
    const operation = this.queue.then(async () => {
      await this.ensureReady();
      if (this.dropped > 0) {
        const dropped = this.dropped;
        this.dropped = 0;
        await this.appendLine(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'WARN',
          component: 'LOGGER',
          message: 'Sebagian record log dilewati karena antrean file penuh.',
          data: { dropped }
        }) + '\n');
      }
      await this.appendLine(line);
    });
    this.queue = operation.catch(error => {
      this.failedWrites += 1;
      this.lastError = String(error?.code || error?.name || 'FILE_LOG_ERROR');
      this.enabled = false;
      if (!this.reportedError) {
        this.reportedError = true;
        process.stderr?.write?.('[MUSE-MD] File logger dinonaktifkan setelah kegagalan penulisan. Periksa direktori log dan izin penyimpanan.\n');
      }
    }).finally(() => {
      this.pending = Math.max(0, this.pending - 1);
    });
    return true;
  }

  async ensureReady() {
    if (this.ready) return;
    await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
    try {
      const stat = await fs.stat(this.filePath);
      this.bytes = stat.size;
      await fs.chmod(this.filePath, 0o600);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      this.bytes = 0;
    }
    this.ready = true;
  }

  async appendLine(line) {
    const size = Buffer.byteLength(line, 'utf8');
    if (this.bytes > 0 && this.bytes + size > this.maxBytes) await this.rotate();
    await fs.appendFile(this.filePath, line, { encoding: 'utf8', mode: 0o600 });
    this.bytes += size;
  }

  async rotate() {
    await fs.rm(this.filePath + '.' + (this.maxFiles - 1), { force: true });
    for (let index = this.maxFiles - 1; index >= 2; index -= 1) {
      try {
        await fs.rename(this.filePath + '.' + (index - 1), this.filePath + '.' + index);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    try {
      await fs.rename(this.filePath, this.filePath + '.1');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    this.bytes = 0;
  }

  async flush() {
    await this.queue;
  }

  async close() {
    if (this.closed) return;
    this.closed = true;
    await this.flush();
  }

  status() {
    return {
      enabled: this.enabled,
      closed: this.closed,
      pending: this.pending,
      dropped: this.dropped,
      failedWrites: this.failedWrites,
      lastError: this.lastError,
      currentBytes: this.bytes,
      maxBytes: this.maxBytes,
      maxFiles: this.maxFiles
    };
  }
}

module.exports = { RotatingFileLog };
