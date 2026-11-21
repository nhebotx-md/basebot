'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const SNAPSHOT_VERSION = 1;
const REQUIRED_FILES = ['meta.json', 'users.json', 'groups.json', 'plugins.json'];
const MAX_FILE_BYTES = 50 * 1024 * 1024;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validId(value) {
  return typeof value === 'string' && /^backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-f0-9]{8}$/.test(value);
}

function createBackupService({ database, logger = console, maxBackups = 14, clock = () => new Date() } = {}) {
  if (!database || typeof database.exportSnapshot !== 'function' || typeof database.restoreSnapshot !== 'function') {
    throw new TypeError('BackupService membutuhkan DatabaseService dengan dukungan snapshot.');
  }
  const root = path.join(database.directory, 'backups');
  const retention = Math.max(2, Math.min(100, Math.floor(Number(maxBackups) || 14)));
  let timer = null;
  let queue = Promise.resolve();
  let stopped = false;

  async function ensureRoot() {
    await fs.mkdir(root, { recursive: true, mode: 0o700 });
    const stat = await fs.lstat(root);
    if (!stat.isDirectory() || stat.isSymbolicLink() || await fs.realpath(root) !== root) {
      throw new Error('Direktori backup tidak aman atau berupa symbolic link.');
    }
    await fs.chmod(root, 0o700);
  }

  async function readSnapshot(id) {
    if (!validId(id)) throw new Error('ID backup tidak valid.');
    await ensureRoot();
    const directory = path.join(root, id);
    const stat = await fs.lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Lokasi backup bukan direktori yang aman.');
    const manifestRaw = await fs.readFile(path.join(directory, 'manifest.json'), 'utf8');
    const manifest = JSON.parse(manifestRaw);
    if (!isRecord(manifest) || manifest.formatVersion !== SNAPSHOT_VERSION || manifest.id !== id || !isRecord(manifest.files)) {
      throw new Error('Manifest backup tidak valid atau tidak didukung.');
    }
    const files = {};
    for (const name of REQUIRED_FILES) {
      const expected = manifest.files[name];
      if (!isRecord(expected) || !/^[a-f0-9]{64}$/.test(expected.sha256) || !Number.isSafeInteger(expected.bytes) || expected.bytes < 1 || expected.bytes > MAX_FILE_BYTES) {
        throw new Error('Metadata checksum backup tidak valid: ' + name);
      }
      const filePath = path.join(directory, name);
      const fileStat = await fs.lstat(filePath);
      if (!fileStat.isFile() || fileStat.isSymbolicLink() || fileStat.size !== expected.bytes) {
        throw new Error('File backup hilang atau ukurannya berubah: ' + name);
      }
      const buffer = await fs.readFile(filePath);
      if (sha256(buffer) !== expected.sha256) throw new Error('Checksum backup tidak cocok: ' + name);
      files[name] = buffer.toString('utf8');
    }
    // Parse and validate every JSON document before it can reach the live database.
    const meta = JSON.parse(files['meta.json']);
    if (!isRecord(meta) || !Number.isInteger(Number(meta.schemaVersion))) throw new Error('Metadata database dalam backup tidak valid.');
    for (const name of REQUIRED_FILES.slice(1)) {
      const parsed = JSON.parse(files[name]);
      const data = isRecord(parsed) && Object.hasOwn(parsed, 'data') ? parsed.data : parsed;
      if (!isRecord(data)) throw new Error('Struktur data backup tidak valid: ' + name);
      if (Number(parsed.schemaVersion || 0) > 1) throw new Error('Backup memakai skema database yang lebih baru: ' + name);
    }
    if (Number(meta.schemaVersion) > 1) throw new Error('Backup dibuat dengan skema database yang lebih baru.');
    return { id, manifest, files };
  }

  async function prune() {
    const rows = await list();
    for (const row of rows.slice(retention)) {
      const directory = path.join(root, row.id);
      const stat = await fs.lstat(directory);
      if (stat.isDirectory() && !stat.isSymbolicLink()) await fs.rm(directory, { recursive: true, force: true });
    }
  }

  async function create({ reason = 'manual' } = {}) {
    const operation = queue.then(async () => {
      if (stopped) throw new Error('Backup service sudah dihentikan.');
      await ensureRoot();
      await database.flush();
      const files = await database.exportSnapshot();
      const now = clock();
      const timestamp = now.toISOString().replace(/Z$/, '').replace(/[:.]/g, '-');
      const id = 'backup-' + timestamp + 'Z-' + crypto.randomBytes(4).toString('hex');
      const staging = path.join(root, '.tmp-' + crypto.randomBytes(8).toString('hex'));
      const destination = path.join(root, id);
      await fs.mkdir(staging, { mode: 0o700 });
      try {
        const manifest = {
          formatVersion: SNAPSHOT_VERSION,
          id,
          createdAt: now.toISOString(),
          reason: String(reason).replace(/[^a-z0-9 _.-]/gi, '').slice(0, 80) || 'manual',
          schemaVersion: 1,
          files: {}
        };
        for (const name of REQUIRED_FILES) {
          const buffer = Buffer.from(files[name], 'utf8');
          if (!buffer.length || buffer.length > MAX_FILE_BYTES) throw new Error('Ukuran file database tidak valid: ' + name);
          await fs.writeFile(path.join(staging, name), buffer, { flag: 'wx', mode: 0o600 });
          manifest.files[name] = { bytes: buffer.length, sha256: sha256(buffer) };
        }
        await fs.writeFile(path.join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
        await fs.rename(staging, destination);
        await prune();
        logger.info?.('Backup database berhasil dibuat.', { id, reason: manifest.reason, files: REQUIRED_FILES.length });
        return { id, createdAt: manifest.createdAt, reason: manifest.reason, bytes: Object.values(manifest.files).reduce((sum, item) => sum + item.bytes, 0) };
      } catch (error) {
        await fs.rm(staging, { recursive: true, force: true }).catch(() => {});
        throw error;
      }
    });
    queue = operation.catch(error => logger.error?.('Pembuatan backup database gagal.', { error }));
    return operation;
  }

  async function list() {
    await ensureRoot();
    const entries = await fs.readdir(root, { withFileTypes: true });
    const rows = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || !validId(entry.name)) continue;
      try {
        const manifest = JSON.parse(await fs.readFile(path.join(root, entry.name, 'manifest.json'), 'utf8'));
        if (manifest?.formatVersion === SNAPSHOT_VERSION && manifest.id === entry.name) {
          rows.push({ id: entry.name, createdAt: manifest.createdAt, reason: manifest.reason || 'manual', bytes: Object.values(manifest.files || {}).reduce((sum, item) => sum + (Number(item.bytes) || 0), 0) });
        }
      } catch { /* corrupted entries remain on disk for manual inspection, but are not advertised */ }
    }
    return rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  async function verify(id) {
    const snapshot = await readSnapshot(id);
    return { id: snapshot.id, valid: true, createdAt: snapshot.manifest.createdAt, files: REQUIRED_FILES.length };
  }

  async function restore(id) {
    const snapshot = await readSnapshot(id);
    const safety = await create({ reason: 'pre-restore safety snapshot' });
    await database.restoreSnapshot(snapshot.files);
    logger.warn?.('Restore database selesai.', { restored: id, safetyBackup: safety.id });
    return { restored: id, safetyBackup: safety.id, createdAt: snapshot.manifest.createdAt };
  }

  async function ensureDailyBackup() {
    const today = clock().toISOString().slice(0, 10);
    const rows = await list();
    if (rows.some(row => String(row.createdAt || '').startsWith(today) && row.reason === 'automatic daily')) return null;
    return create({ reason: 'automatic daily' });
  }

  function start() {
    if (timer || stopped) return;
    ensureDailyBackup().catch(error => logger.error?.('Backup harian otomatis gagal.', { error }));
    timer = setInterval(() => {
      ensureDailyBackup().catch(error => logger.error?.('Backup harian otomatis gagal.', { error }));
    }, 6 * 60 * 60 * 1000);
    timer.unref?.();
  }

  function stop() {
    stopped = true;
    if (timer) clearInterval(timer);
    timer = null;
  }

  return Object.freeze({ create, list, verify, restore, start, stop, status: () => ({ directory: root, retention, automatic: Boolean(timer) }) });
}

module.exports = { createBackupService, SNAPSHOT_VERSION };
