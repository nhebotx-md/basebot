'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const CURRENT_SCHEMA_VERSION = 1;
const COLLECTIONS = new Set(['users', 'groups', 'plugins']);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

class DatabaseService {
  constructor({ directory = './data/database', logger = console, maxBackups = 5 } = {}) {
    if (!directory) throw new TypeError('DatabaseService membutuhkan direktori penyimpanan.');
    this.directory = path.resolve(directory);
    this.backupDirectory = path.join(this.directory, 'backups');
    this.logger = logger;
    this.maxBackups = Math.max(1, Number(maxBackups) || 5);
    this.collections = new Map();
    this.writeQueue = Promise.resolve();
    this.pendingWrites = 0;
    this.initialized = false;
    this.closed = false;
  }

  async init() {
    if (this.initialized) return this;
    await fs.mkdir(this.backupDirectory, { recursive: true, mode: 0o700 });
    const metaPath = path.join(this.directory, 'meta.json');
    let meta = { schemaVersion: 0, createdAt: new Date().toISOString() };
    try {
      meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));
      if (!isRecord(meta)) throw new Error('Format meta database tidak valid.');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.warn?.('Metadata database tidak dapat dibaca; mencoba backup.', { error: error.message });
        try {
          meta = JSON.parse(await fs.readFile(metaPath + '.bak', 'utf8'));
        } catch {
          throw new Error('Metadata database rusak dan backup tidak tersedia.', { cause: error });
        }
      }
    }
    const version = Number(meta.schemaVersion || 0);
    if (version > CURRENT_SCHEMA_VERSION) {
      throw new Error('Versi database lebih baru daripada versi MUSE-MD. Upgrade aplikasi diperlukan.');
    }
    if (version < 1) {
      meta = { ...meta, schemaVersion: 1, createdAt: meta.createdAt || new Date().toISOString(), migratedAt: new Date().toISOString() };
    }

    for (const name of COLLECTIONS) {
      const filePath = path.join(this.directory, name + '.json');
      let parsed = {};
      try {
        parsed = JSON.parse(await fs.readFile(filePath, 'utf8'));
      } catch (error) {
        if (error.code !== 'ENOENT') {
          this.logger.warn?.('File database rusak; mencoba backup terakhir.', { collection: name, error: error.message });
          try {
            parsed = JSON.parse(await fs.readFile(filePath + '.bak', 'utf8'));
          } catch {
            throw new Error('File database "' + name + '" rusak dan backup tidak tersedia.', { cause: error });
          }
        }
      }
      if (isRecord(parsed) && Number.isInteger(parsed.schemaVersion) && parsed.schemaVersion > CURRENT_SCHEMA_VERSION) {
        throw new Error('Collection "' + name + '" menggunakan skema lebih baru daripada aplikasi.');
      }
      const data = isRecord(parsed) && Object.hasOwn(parsed, 'data') && Number.isInteger(parsed.schemaVersion)
        ? parsed.data
        : parsed;
      if (!isRecord(data)) throw new Error('Struktur collection "' + name + '" tidak valid.');
      this.collections.set(name, clone(data));
      await this._atomicWrite(filePath, this._serializeCollection(data), { backup: false });
    }

    await this._atomicWrite(metaPath, JSON.stringify(meta, null, 2) + '\n', { backup: true });
    this.initialized = true;
    this.logger.info?.('JSON database siap.', { directory: this.directory, schemaVersion: CURRENT_SCHEMA_VERSION });
    return this;
  }

  _assertReady() {
    if (!this.initialized || this.closed) throw new Error('DatabaseService belum siap atau sudah ditutup.');
  }

  _serializeCollection(data) {
    return JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, updatedAt: new Date().toISOString(), data }, null, 2) + '\n';
  }

  async _atomicWrite(filePath, content, { backup = true } = {}) {
    const temporary = filePath + '.' + process.pid + '.' + Date.now() + '.tmp';
    let handle;
    try {
      handle = await fs.open(temporary, 'wx', 0o600);
      await handle.writeFile(content, 'utf8');
      await handle.sync();
      await handle.close();
      handle = null;
      if (backup) {
        try {
          await fs.copyFile(filePath, filePath + '.bak');
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
      }
      await fs.rename(temporary, filePath);
      try {
        const directoryHandle = await fs.open(path.dirname(filePath), 'r');
        await directoryHandle.sync();
        await directoryHandle.close();
      } catch { /* directory fsync is not supported on every platform */ }
    } catch (error) {
      if (handle) await handle.close().catch(() => {});
      await fs.rm(temporary, { force: true }).catch(() => {});
      throw error;
    }
  }

  exportSnapshot() {
    this._assertReady();
    const operation = this.writeQueue.then(async () => {
      const files = {};
      for (const name of ['meta.json', ...[...COLLECTIONS].map(collection => collection + '.json')].sort()) {
        files[name] = await fs.readFile(path.join(this.directory, name), 'utf8');
      }
      return files;
    });
    this.writeQueue = operation.catch(error => {
      this.logger.error?.('Ekspor snapshot database gagal.', { error });
    });
    return operation;
  }

  restoreSnapshot(files) {
    this._assertReady();
    if (!isRecord(files) || !['meta.json', ...[...COLLECTIONS].map(name => name + '.json')].every(name => typeof files[name] === 'string')) {
      throw new TypeError('Snapshot database tidak lengkap.');
    }
    const parsed = {};
    for (const name of COLLECTIONS) {
      const envelope = JSON.parse(files[name + '.json']);
      const data = isRecord(envelope) && Object.hasOwn(envelope, 'data') ? envelope.data : envelope;
      if (!isRecord(data) || (Number(envelope.schemaVersion || 0) > CURRENT_SCHEMA_VERSION)) {
        throw new Error('Snapshot collection "' + name + '" tidak valid atau memakai skema lebih baru.');
      }
      parsed[name] = clone(data);
    }
    const meta = JSON.parse(files['meta.json']);
    if (!isRecord(meta) || Number(meta.schemaVersion || 0) > CURRENT_SCHEMA_VERSION) {
      throw new Error('Metadata snapshot tidak valid atau memakai skema lebih baru.');
    }

    const operation = this.writeQueue.then(async () => {
      const names = ['meta.json', ...[...COLLECTIONS].map(name => name + '.json')];
      const originals = new Map();
      const staged = new Map();
      const replaced = [];
      const nonce = process.pid + '.' + Date.now() + '.' + Math.random().toString(16).slice(2);
      try {
        for (const name of names) {
          const target = path.join(this.directory, name);
          originals.set(name, await fs.readFile(target));
          const temporary = target + '.' + nonce + '.restore.tmp';
          const handle = await fs.open(temporary, 'wx', 0o600);
          try {
            await handle.writeFile(files[name], 'utf8');
            await handle.sync();
          } finally {
            await handle.close();
          }
          staged.set(name, temporary);
        }
        for (const name of names) {
          await fs.rename(staged.get(name), path.join(this.directory, name));
          replaced.push(name);
        }
        for (const name of COLLECTIONS) this.collections.set(name, parsed[name]);
        this.logger.warn?.('Database berhasil dipulihkan dari snapshot.', { collections: [...COLLECTIONS] });
        return true;
      } catch (error) {
        for (const name of replaced.reverse()) {
          const target = path.join(this.directory, name);
          const rollback = target + '.' + nonce + '.rollback.tmp';
          try {
            const handle = await fs.open(rollback, 'wx', 0o600);
            try { await handle.writeFile(originals.get(name)); await handle.sync(); }
            finally { await handle.close(); }
            await fs.rename(rollback, target);
          } catch (rollbackError) {
            this.logger.error?.('Rollback database gagal; periksa file database secara manual.', { file: name, error: rollbackError });
            throw new Error('Restore gagal dan rollback file "' + name + '" juga gagal.', { cause: rollbackError });
          }
        }
        throw error;
      } finally {
        for (const temporary of staged.values()) await fs.rm(temporary, { force: true }).catch(() => {});
      }
    });
    this.writeQueue = operation.catch(error => {
      this.logger.error?.('Restore database gagal.', { error });
    });
    return operation;
  }

  read(collection) {
    this._assertReady();
    if (!COLLECTIONS.has(collection)) throw new Error('Collection database tidak dikenal: ' + collection);
    return clone(this.collections.get(collection) || {});
  }

  update(collection, updater) {
    this._assertReady();
    if (!COLLECTIONS.has(collection)) throw new Error('Collection database tidak dikenal: ' + collection);
    if (typeof updater !== 'function') throw new TypeError('Updater database harus berupa function.');
    this.pendingWrites += 1;
    const operation = this.writeQueue.then(async () => {
      const draft = clone(this.collections.get(collection) || {});
      const result = await updater(draft);
      const next = result === undefined ? draft : result;
      if (!isRecord(next)) throw new TypeError('Data collection harus berupa object.');
      const filePath = path.join(this.directory, collection + '.json');
      await this._atomicWrite(filePath, this._serializeCollection(next));
      this.collections.set(collection, clone(next));
      return clone(next);
    });
    const tracked = operation.finally(() => { this.pendingWrites = Math.max(0, this.pendingWrites - 1); });
    this.writeQueue = tracked.catch(error => {
      this.logger.error?.('Penyimpanan JSON database gagal.', { collection, error });
    });
    return tracked;
  }

  async replace(collection, data) {
    return this.update(collection, () => data);
  }

  async flush() {
    await this.writeQueue;
  }

  async close() {
    if (this.closed) return;
    await this.flush();
    this.closed = true;
  }

  status() {
    return {
      initialized: this.initialized,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      directory: this.directory,
      collections: [...COLLECTIONS],
      pendingWrites: this.writeQueue !== Promise.resolve()
    };
  }
}

module.exports = { DatabaseService, CURRENT_SCHEMA_VERSION, COLLECTIONS };