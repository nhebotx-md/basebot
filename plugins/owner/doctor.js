'use strict';

module.exports = {
  name: 'doctor',
  commands: ['doctor'],
  category: 'owner',
  description: 'Memeriksa konfigurasi, dependency, direktori, database, koneksi, dan plugin BASEBOT.',
  usage: '.doctor',
  permissions: { ownerOnly: true },
  async execute(ctx) {
    if (ctx.isNewsletter || ctx.isChannel) { await ctx.reply('System Doctor hanya tersedia di chat pribadi atau grup.'); return; }
    if (!ctx.isOwner) { await ctx.reply('Fitur ini khusus owner.'); return; }
    const doctor = ctx.services?.doctor;
    if (!doctor || typeof doctor.run !== 'function') { await ctx.reply('System Doctor belum tersedia pada runtime ini.'); return; }
    const report = await doctor.run();
    const icon = report.status === 'healthy' ? '✓' : report.status === 'warning' ? '!' : '×';
    const lines = ['*BASEBOT SYSTEM DOCTOR*', 'Status: *' + report.status.toUpperCase() + '* ' + icon,
      'Pemeriksaan: ' + report.summary.passed + ' lolos · ' + report.summary.warnings + ' peringatan · ' + report.summary.failures + ' gagal', ''];
    for (const check of report.checks) {
      lines.push((check.status === 'pass' ? '✓' : check.status === 'warn' ? '!' : '×') + ' *' + check.name + '*: ' + check.detail);
      if (check.recommendation && check.status !== 'pass') lines.push('  Saran: ' + check.recommendation);
    }
    await ctx.reply(lines.join('\n'));
  }
};
