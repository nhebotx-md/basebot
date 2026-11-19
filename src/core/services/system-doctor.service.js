'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { constants } = require('node:fs');
const { getSettingsSource } = require('../../config/config-loader');

function versionAtLeast(actual, minimum) {
  const a = String(actual).replace(/^v/, '').split('.').map(Number);
  const b = String(minimum).split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if ((a[i] || 0) > (b[i] || 0)) return true;
    if ((a[i] || 0) < (b[i] || 0)) return false;
  }
  return true;
}

class SystemDoctorService {
  constructor({ config, database, registry, connection, pluginManager, cwd = process.cwd(), nodeVersion = process.version } = {}) {
    this.config = config;
    this.database = database;
    this.registry = registry;
    this.connection = connection;
    this.pluginManager = pluginManager;
    this.cwd = cwd;
    this.nodeVersion = nodeVersion;
  }

  async run() {
    const checks = [];
    const add = (name, status, detail, recommendation = '') => checks.push({ name, status, detail, recommendation });
    add('Node.js', versionAtLeast(this.nodeVersion, '22.13.0') ? 'pass' : 'fail', this.nodeVersion, 'Gunakan Node.js 22.13.0 atau lebih baru.');
    let source = 'unknown';
    try { source = getSettingsSource(this.cwd); } catch {}
    add('Konfigurasi', source === 'local' ? 'pass' : source === 'template' ? 'warn' : 'fail',
      source === 'local' ? 'settings.js lokal terdeteksi; isi konfigurasi tidak dibaca ulang atau ditampilkan.' : source === 'template' ? 'Template settings.example.js sedang digunakan.' : 'File konfigurasi tidak ditemukan.',
      source === 'local' ? '' : 'Salin settings.example.js menjadi settings.js lalu isi nomor owner dan pengaturan bot.');
    try { await fs.access(path.join(this.cwd, '.env')); add('.env', 'pass', 'File kredensial tersedia; nilainya tidak dibaca atau ditampilkan.'); }
    catch { add('.env', 'warn', 'File .env belum tersedia.', 'Salin .env.example menjadi .env bila plugin memerlukan API key.'); }

    for (const name of ['@itsliaaa/baileys', 'axios']) {
      try { require.resolve(name, { paths: [this.cwd] }); add('Dependency ' + name, 'pass', 'Modul tersedia.'); }
      catch { add('Dependency ' + name, 'fail', 'Modul tidak ditemukan.', 'Jalankan npm ci dari root project.'); }
    }
    try { require.resolve('@ffmpeg-installer/ffmpeg', { paths: [this.cwd] }); add('FFmpeg package', 'pass', 'Paket tersedia.'); }
    catch { add('FFmpeg package', 'warn', 'Paket tidak ditemukan.', 'Jalankan npm ci dan periksa dukungan platform.'); }

    for (const [name, directory] of Object.entries({ session: this.config.paths.session, temp: this.config.paths.temp, logs: this.config.paths.logs, database: this.config.paths.database })) {
      try {
        const resolved = path.resolve(this.cwd, directory);
        await fs.access(resolved);
        await fs.access(resolved, constants.W_OK);
        add('Direktori ' + name, 'pass', 'Direktori tersedia dan dapat ditulis.');
      } catch { add('Direktori ' + name, 'fail', 'Direktori tidak tersedia atau tidak dapat ditulis.', 'Periksa path dan permission direktori.'); }
    }

    const db = this.database?.status?.() || {};
    add('Database', db.initialized && !db.closed ? 'pass' : 'fail', db.initialized && !db.closed ? 'Database siap.' : 'Database belum siap atau sudah ditutup.', 'Periksa data/database dan log startup.');
    const state = this.connection?.status?.state || 'unknown';
    add('WhatsApp', state === 'open' ? 'pass' : 'warn', 'Status koneksi: ' + state + '.', 'Pastikan sesi terdaftar dan koneksi internet tersedia.');
    let stats;
    try { stats = this.pluginManager?.stats?.(); } catch {}
    add('Plugin registry', stats && stats.total > 0 && stats.enabled > 0 ? 'pass' : 'warn',
      stats ? stats.enabled + '/' + stats.total + ' plugin aktif.' : 'Statistik plugin tidak tersedia.',
      'Periksa log startup untuk plugin yang gagal dimuat.');

    const failures = checks.filter(item => item.status === 'fail').length;
    const warnings = checks.filter(item => item.status === 'warn').length;
    return { status: failures ? 'critical' : warnings ? 'warning' : 'healthy', generatedAt: new Date().toISOString(),
      summary: { total: checks.length, passed: checks.filter(item => item.status === 'pass').length, warnings, failures }, checks };
  }
}

module.exports = { SystemDoctorService, versionAtLeast };
