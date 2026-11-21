'use strict';

function formatBytes(value) {
  const bytes = Math.max(0, Number(value) || 0);
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function safeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'tanggal tidak valid' : date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
}

module.exports = {
  name: 'database-backup',
  commands: ['backup'],
  category: 'owner',
  description: 'Membuat, memeriksa, dan memulihkan backup database BASEBOT.',
  usage: '.backup [create|list|verify <id>|restore <id>|restore confirm <id>]',
  permissions: { ownerOnly: true },
  async execute(ctx) {
    if (ctx.isNewsletter || ctx.isChannel) {
      await ctx.reply('Backup database hanya dapat dijalankan melalui chat pribadi atau grup oleh owner.');
      return;
    }
    if (!ctx.isOwner) {
      await ctx.reply('Fitur ini khusus owner.');
      return;
    }
    const backups = ctx.services?.backups;
    if (!backups) {
      await ctx.reply('Backup service belum tersedia pada runtime ini.');
      return;
    }

    const args = Array.isArray(ctx.args) ? ctx.args : [];
    const action = String(args[0] || 'list').toLowerCase();
    const prefix = typeof ctx.prefix === 'string' ? ctx.prefix : '.';

    if (action === 'create') {
      const result = await backups.create({ reason: 'manual command' });
      await ctx.reply(['*BACKUP DATABASE BERHASIL*', 'ID: ' + result.id, 'Dibuat: ' + safeDate(result.createdAt), 'Ukuran: ' + formatBytes(result.bytes), 'Backup tersimpan di penyimpanan lokal server.'].join('\n'));
      return;
    }

    if (action === 'list') {
      const rows = await backups.list();
      if (!rows.length) {
        await ctx.reply('*BACKUP DATABASE*\nBelum ada backup yang tersimpan. Gunakan ' + prefix + 'backup create untuk membuat backup pertama.');
        return;
      }
      const lines = rows.slice(0, 10).map((item, index) =>
        (index + 1) + '. *' + item.id + '*\n   ' + safeDate(item.createdAt) + ' · ' + formatBytes(item.bytes) + ' · ' + String(item.reason || 'manual')
      );
      await ctx.reply(['*DAFTAR BACKUP DATABASE* (' + rows.length + ')', '', ...lines, '', 'Gunakan ' + prefix + 'backup verify <ID> untuk memeriksa integritas.'].join('\n'));
      return;
    }

    if (action === 'verify') {
      const id = String(args[1] || '');
      if (!id) {
        await ctx.reply('Format: ' + prefix + 'backup verify <ID>');
        return;
      }
      const result = await backups.verify(id);
      await ctx.reply(['*BACKUP VALID*', 'ID: ' + result.id, 'Dibuat: ' + safeDate(result.createdAt), 'File terverifikasi: ' + result.files, 'Checksum SHA-256 seluruh file cocok.'].join('\n'));
      return;
    }

    if (action === 'restore') {
      const mode = String(args[1] || '').toLowerCase();
      const id = String(args[mode === 'confirm' ? 2 : 1] || '');
      if (!id) {
        await ctx.reply('Format: ' + prefix + 'backup restore <ID>\nLanjutkan hanya setelah ID backup dipastikan benar.');
        return;
      }
      if (mode !== 'confirm') {
        const verified = await backups.verify(id);
        await ctx.reply([
          '*KONFIRMASI RESTORE DATABASE*',
          'Backup: ' + verified.id,
          'Dibuat: ' + safeDate(verified.createdAt),
          'Integritas: VALID',
          '',
          'Restore akan mengganti data users, groups, plugins, dan metadata database aktif.',
          'Sebelum restore, BASEBOT otomatis membuat safety backup dari data saat ini.',
          '',
          'Untuk menjalankan restore, kirim command berikut:',
          '*' + prefix + 'backup restore confirm ' + verified.id + '*'
        ].join('\n'));
        return;
      }
      const result = await backups.restore(id);
      let pluginStateNote = 'Status plugin aktif diselaraskan dengan database.';
      try { await ctx.services?.pluginManager?.restore?.(); }
      catch { pluginStateNote = 'Status plugin tersimpan, tetapi sinkronisasi runtime gagal. Restart BASEBOT sebelum digunakan kembali.'; }
      await ctx.reply([
        '*RESTORE DATABASE SELESAI*',
        'Backup dipulihkan: ' + result.restored,
        'Safety backup saat sebelum restore: ' + result.safetyBackup,
        'Data database aktif sudah dipulihkan.',
        pluginStateNote,
        'Periksa data melalui fitur bot sebelum melanjutkan operasi normal.'
      ].join('\n'));
      return;
    }

    if (action === 'status') {
      const status = backups.status();
      const recovery = status.recovery?.recovered ? 'Pemulihan terakhir: berhasil (' + status.recovery.snapshotId + ')' : status.recovery?.freshInstall ? 'Status database: instalasi baru' : status.recovery?.healthy ? 'Status database: sehat' : 'Status database: belum diperiksa';
      const lastBackup = status.lastAutoBackupAt ? safeDate(status.lastAutoBackupAt) : 'belum ada';
      await ctx.reply(['*BACKUP & DISASTER RECOVERY*', 'Direktori: ' + status.directory, 'Retensi: ' + status.retention + ' snapshot', 'Interval otomatis: ' + Math.round(status.intervalMs / 3600000) + ' jam', 'Scheduler: ' + (status.automatic ? 'aktif' : 'belum berjalan'), 'Backup otomatis terakhir: ' + lastBackup, recovery, 'Error terakhir: ' + (status.lastBackupError || 'tidak ada')].join('\n'));
      return;
    }

    await ctx.reply([
      '*DATABASE BACKUP*',
      prefix + 'backup create',
      prefix + 'backup list',
      prefix + 'backup verify <ID>',
      prefix + 'backup restore <ID>',
      prefix + 'backup restore confirm <ID>',
      prefix + 'backup status'
    ].join('\n'));
  }
};
