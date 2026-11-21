'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const SNAPSHOT_VERSION = 1;
const REQUIRED_FILES = ['meta.json', 'users.json', 'groups.json', 'plugins.json'];
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const AUTO_INTERVAL_MS = 6 * 60 * 60 * 1000;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function validId(value) {
  return typeof value === 'string' && /^backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-f0-9]{8}$/.test(value);
}
function parseDatabaseFiles(files) {
  const meta = JSON.parse(files['meta.json']);
  if (!isRecord(meta) || !Number.isInteger(Number(meta.schemaVersion)) || Number(meta.schemaVersion) > 1) {
    throw new Error('Metadata database tidak valid atau memakai skema lebih baru.');
  }
  for (const name of REQUIRED_FILES.slice(1)) {
    const parsed = JSON.parse(files[name]);
    const data = isRecord(parsed) && Object.hasOwn(parsed, 'data') ? parsed.data : parsed;
    if (!isRecord(data)) throw new Error('Struktur collection tidak valid: ' + name);
    if (Number(parsed.schemaVersion || 0) > 1) throw new Error('Collection memakai skema lebih baru: ' + name);
  }
  return true;
}

function createBackupService({ database, logger = console, maxBackups = 14, intervalMs = AUTO_INTERVAL_MS, owners = [], clock = () => new Date() } = {}) {
  if (!database || typeof database.exportSnapshot !== 'function' || typeof database.restoreSnapshot !== 'function') {
    throw new TypeError('BackupService membutuhkan DatabaseService dengan dukungan snapshot.');
  }
  const root = path.join(database.directory, 'backups');
  const retention = Math.max(2, Math.min(100, Math.floor(Number(maxBackups) || 14)));
  const ownerNumbers = [...new Set((Array.isArray(owners) ? owners : []).map(value => String(value).replace(/\D/g, '')).filter(Boolean))];
  let timer = null;
  let queue = Promise.resolve();
  let stopped = false;
  let recovery = null;
  let notificationQueue = [];
  let lastAutoBackupAt = null;
  let lastBackupError = null;

  function serialize(operation) {
    const result = queue.then(operation);
    queue = result.catch(error => logger.error?.('Operasi backup database gagal.', { error }));
    return result;
  }

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
    const manifestPath = path.join(directory, 'manifest.json');
    const manifestStat = await fs.lstat(manifestPath);
    if (!manifestStat.isFile() || manifestStat.isSymbolicLink() || manifestStat.size > 64 * 1024) throw new Error('Manifest backup tidak aman atau terlalu besar.');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
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
      if (!fileStat.isFile() || fileStat.isSymbolicLink() || fileStat.size !== expected.bytes) throw new Error('File backup hilang atau ukurannya berubah: ' + name);
      const buffer = await fs.readFile(filePath);
      if (sha256(buffer) !== expected.sha256) throw new Error('Checksum backup tidak cocok: ' + name);
      files[name] = buffer.toString('utf8');
    }
    parseDatabaseFiles(files);
    return { id, manifest, files };
  }

  async function list() {
    await ensureRoot();
    const entries = await fs.readdir(root, { withFileTypes: true });
    const rows = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || !validId(entry.name)) continue;
      try {
        const snapshot = await readSnapshot(entry.name);
        rows.push({
          id: entry.name,
          createdAt: snapshot.manifest.createdAt,
          reason: snapshot.manifest.reason || 'manual',
          bytes: Object.values(snapshot.manifest.files).reduce((sum, item) => sum + item.bytes, 0),
          valid: true
        });
      } catch (error) {
        rows.push({ id: entry.name, valid: false, error: error.message });
      }
    }
    return rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }

  async function prune() {
    const rows = await list();
    const validRows = rows.filter(row => row.valid);
    for (const row of validRows.slice(retention)) {
      const directory = path.join(root, row.id);
      const stat = await fs.lstat(directory);
      if (stat.isDirectory() && !stat.isSymbolicLink()) await fs.rm(directory, { recursive: true, force: true });
    }
  }

  async function createUnlocked({ reason = 'manual' } = {}) {
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
      lastBackupError = null;
      if (manifest.reason.startsWith('automatic')) lastAutoBackupAt = manifest.createdAt;
      logger.info?.('Backup database berhasil dibuat.', { id, reason: manifest.reason, files: REQUIRED_FILES.length });
      return { id, createdAt: manifest.createdAt, reason: manifest.reason, bytes: Object.values(manifest.files).reduce((sum, item) => sum + item.bytes, 0) };
    } catch (error) {
      await fs.rm(staging, { recursive: true, force: true }).catch(() => {});
      lastBackupError = error.message;
      throw error;
    }
  }

  async function writeRecoveredFiles(files, snapshotId) {
    const quarantine = path.join(database.directory, 'recovery-quarantine', clock().toISOString().replace(/[:.]/g, '-'));
    await fs.mkdir(quarantine, { recursive: true, mode: 0o700 });
    for (const name of REQUIRED_FILES) {
      try { await fs.copyFile(path.join(database.directory, name), path.join(quarantine, name)); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      try { await fs.copyFile(path.join(database.directory, name + '.bak'), path.join(quarantine, name + '.bak')); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    const staged = new Map();
    const replaced = [];
    const originals = new Map();
    const nonce = crypto.randomBytes(8).toString('hex');
    try {
      for (const name of REQUIRED_FILES) {
        const target = path.join(database.directory, name);
        try { originals.set(name, await fs.readFile(target)); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
        const temporary = target + '.' + nonce + '.recovery.tmp';
        const handle = await fs.open(temporary, 'wx', 0o600);
        try { await handle.writeFile(files[name], 'utf8'); await handle.sync(); }
        finally { await handle.close(); }
        staged.set(name, temporary);
      }
      for (const name of REQUIRED_FILES) {
        await fs.rename(staged.get(name), path.join(database.directory, name));
        replaced.push(name);
      }
      recovery = { recovered: true, snapshotId, recoveredAt: clock().toISOString(), quarantine };
      notificationQueue.push('DATABASE RECOVERY BERHASIL\nDatabase BASEBOT terdeteksi rusak saat startup dan dipulihkan otomatis dari snapshot terverifikasi: ' + snapshotId + '. Salinan file sebelum pemulihan disimpan di recovery-quarantine. Periksa data dan buat backup eksternal.');
      logger.warn?.('Disaster recovery database berhasil.', recovery);
    } catch (error) {
      for (const name of replaced.reverse()) {
        const target = path.join(database.directory, name);
        const original = originals.get(name);
        if (original === undefined) { await fs.rm(target, { force: true }).catch(() => {}); continue; }
        const rollback = target + '.' + nonce + '.rollback.tmp';
        try {
          await fs.writeFile(rollback, original, { flag: 'wx', mode: 0o600 });
          await fs.rename(rollback, target);
        } catch (rollbackError) {
          logger.error?.('Rollback disaster recovery gagal.', { file: name, error: rollbackError });
        }
      }
      throw error;
    } finally {
      for (const temporary of staged.values()) await fs.rm(temporary, { force: true }).catch(() => {});
    }
  }

  async function recoverBeforeInit() {
    await fs.mkdir(database.directory, { recursive: true, mode: 0o700 });
    const present = [];
    for (const name of REQUIRED_FILES) {
      try {
        const stat = await fs.lstat(path.join(database.directory, name));
        if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('File database bukan file biasa: ' + name);
        present.push(name);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    if (present.length === 0) {
      recovery = { recovered: false, freshInstall: true };
      return { action: 'fresh-install' };
    }

    let corruption = null;
    if (present.length !== REQUIRED_FILES.length) {
      corruption = new Error('Database tidak lengkap; file yang tersedia: ' + present.join(', '));
    } else {
      try {
        const files = {};
        for (const name of REQUIRED_FILES) {
          const raw = await fs.readFile(path.join(database.directory, name), 'utf8');
          if (Buffer.byteLength(raw) > MAX_FILE_BYTES) throw new Error('File database terlalu besar: ' + name);
          files[name] = raw;
        }
        parseDatabaseFiles(files);
        recovery = { recovered: false, healthy: true, checkedAt: clock().toISOString() };
        return { action: 'healthy' };
      } catch (error) {
        if (/skema lebih baru/i.test(error.message)) throw error;
        corruption = error;
      }
    }

    logger.error?.('Kerusakan database terdeteksi sebelum inisialisasi.', { error: corruption.message });
    const candidates = (await list()).filter(row => row.valid).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    for (const candidate of candidates) {
      try {
        const snapshot = await readSnapshot(candidate.id);
        await writeRecoveredFiles(snapshot.files, snapshot.id);
        return { action: 'recovered', snapshotId: snapshot.id, cause: corruption.message };
      } catch (error) {
        logger.warn?.('Snapshot tidak dapat digunakan untuk disaster recovery; mencoba snapshot berikutnya.', { id: candidate.id, error: error.message });
      }
    }
    notificationQueue.push('DATABASE RECOVERY GAGAL\nBASEBOT mendeteksi database rusak, tetapi tidak menemukan snapshot yang valid dan kompatibel. Runtime dihentikan agar data tidak tertimpa. Periksa folder data/database dan recovery-quarantine.');
    throw new Error('Database rusak dan tidak ada snapshot valid untuk pemulihan otomatis. Startup dihentikan demi keamanan data.', { cause: corruption });
  }

  async function verify(id) {
    const snapshot = await readSnapshot(id);
    return { id: snapshot.id, valid: true, createdAt: snapshot.manifest.createdAt, files: REQUIRED_FILES.length };
  }

  async function restore(id) {
    return serialize(async () => {
      const snapshot = await readSnapshot(id);
      const safety = await createUnlocked({ reason: 'pre-restore safety snapshot' });
      await database.restoreSnapshot(snapshot.files);
      logger.warn?.('Restore database selesai.', { restored: id, safetyBackup: safety.id });
      return { restored: id, safetyBackup: safety.id, createdAt: snapshot.manifest.createdAt };
    });
  }

  async function create(options = {}) {
    return serialize(() => createUnlocked(options));
  }

  async function ensureAutomaticBackup() {
    const rows = (await list()).filter(row => row.valid);
    const latest = rows.find(row => String(row.reason || '').startsWith('automatic'));
    if (!latest) return create({ reason: 'automatic startup baseline' });
    const age = clock().getTime() - new Date(latest.createdAt).getTime();
    if (!Number.isFinite(age) || age >= intervalMs) return create({ reason: 'automatic periodic' });
    return null;
  }

  function start() {
    if (timer || stopped) return;
    ensureAutomaticBackup().catch(error => {
      lastBackupError = error.message;
      notificationQueue.push('BACKUP OTOMATIS GAGAL\nPembuatan backup otomatis BASEBOT gagal: ' + error.message);
      logger.error?.('Backup otomatis gagal.', { error });
    });
    timer = setInterval(() => {
      ensureAutomaticBackup().catch(error => {
        lastBackupError = error.message;
        notificationQueue.push('BACKUP OTOMATIS GAGAL\nPembuatan backup otomatis BASEBOT gagal: ' + error.message);
        logger.error?.('Backup otomatis gagal.', { error });
      });
    }, Math.max(60_000, intervalMs));
    timer.unref?.();
  }

  async function notifyOwner(client) {
    if (!client || typeof client.sendMessage !== 'function' || !ownerNumbers.length || !notificationQueue.length) return;
    const messages = notificationQueue.splice(0);
    for (const message of messages) {
      for (const number of ownerNumbers) {
        try { await client.sendMessage(number + '@s.whatsapp.net', { text: message }); }
        catch (error) {
          notificationQueue.unshift(message);
          logger.warn?.('Notifikasi backup ke owner gagal dikirim.', { error: error.message });
          return;
        }
      }
    }
  }

  function stop() {
    stopped = true;
    if (timer) clearInterval(timer);
    timer = null;
  }

  return Object.freeze({
    create, list, verify, restore, start, stop, recoverBeforeInit, notifyOwner,
    status: () => ({
      directory: root,
      retention,
      automatic: Boolean(timer),
      intervalMs,
      lastAutoBackupAt,
      lastBackupError,
      recovery
    })
  });
}

module.exports = { createBackupService, SNAPSHOT_VERSION, AUTO_INTERVAL_MS };