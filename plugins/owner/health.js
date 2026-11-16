'use strict';

function formatMb(value) { return Number.isFinite(value) ? value.toFixed(1) + ' MB' : 'n/a'; }
function statusLabel(status) { return ({ healthy: 'HEALTHY', degraded: 'DEGRADED', critical: 'CRITICAL' })[status] || 'UNKNOWN'; }

function summary(report, prefix) {
  return [
    '*BASEBOT HEALTH*',
    'Status: *' + statusLabel(report.status) + '*',
    'Uptime: ' + report.uptimeSeconds + ' detik',
    'WhatsApp: ' + report.whatsapp.state + (report.whatsapp.connected ? ' (connected)' : ' (not connected)'),
    'Database: ' + (report.database.ready ? 'ready' : 'unavailable'),
    'Plugin: ' + report.plugins.enabled + '/' + report.plugins.total + ' aktif · ' + report.plugins.commands + ' command',
    'Memory RSS: ' + formatMb(report.memory.rssMb),
    '',
    'Detail: ' + prefix + 'health detail'
  ].join('\n');
}

function details(report) {
  return [
    '*RUNTIME*',
    'Node: ' + report.runtime.node + ' · ' + report.runtime.platform + '/' + report.runtime.arch,
    'PID: ' + report.runtime.pid + ' · Process uptime: ' + report.runtime.processUptimeSeconds + ' detik',
    'Load average (1/5/15m): ' + report.runtime.loadAverage.join(' / '),
    'Event loop p95/max: ' + report.eventLoopDelay.p95Ms + ' / ' + report.eventLoopDelay.maxMs + ' ms',
    '',
    '*WHATSAPP*',
    'State: ' + report.whatsapp.state,
    'Reconnect attempts: ' + report.whatsapp.reconnectAttempts,
    'Last connected: ' + (report.whatsapp.lastConnectedAt || 'belum pernah terhubung'),
    '',
    '*DATABASE*',
    'Ready: ' + (report.database.ready ? 'yes' : 'no'),
    'Schema: ' + (report.database.schemaVersion ?? 'unknown'),
    'Collections: ' + report.database.collections.join(', '),
    'Pending writes: ' + report.database.pendingWrites,
    '',
    '*PLUGINS*',
    'Total: ' + report.plugins.total,
    'Enabled: ' + report.plugins.enabled,
    'Disabled: ' + report.plugins.disabled,
    'Commands: ' + report.plugins.commands,
    'Categories: ' + report.plugins.categories,
    'Startup loaded/discovered: ' + report.plugins.loadedAtStartup + '/' + report.plugins.discoveredAtStartup,
    'Startup skipped: ' + report.plugins.skippedAtStartup,
    '',
    '*MEMORY*',
    'RSS: ' + formatMb(report.memory.rssMb),
    'Heap: ' + formatMb(report.memory.heapUsedMb) + ' / ' + formatMb(report.memory.heapTotalMb) + ' (' + report.memory.heapUsagePercent + '%)',
    'External: ' + formatMb(report.memory.externalMb),
    'Array buffers: ' + formatMb(report.memory.arrayBuffersMb),
    '',
    '*CHECKS*',
    ...report.checks.map(check => check.name + ': ' + statusLabel(check.status) + ' (' + check.detail + ')')
  ].join('\n');
}

module.exports = {
  name: 'health',
  commands: ['health'],
  category: 'owner',
  description: 'Memeriksa kesehatan runtime, koneksi, database, plugin, dan resource BASEBOT.',
  usage: '.health [detail|plugins|memory]',
  permissions: { ownerOnly: true },
  async execute(ctx) {
    if (ctx.isNewsletter || ctx.isChannel) { await ctx.reply('Health Monitor hanya dapat dijalankan melalui chat pribadi atau grup oleh owner.'); return; }
    if (!ctx.isOwner) { await ctx.reply('Fitur ini khusus owner.'); return; }
    const health = ctx.services?.health;
    if (!health || typeof health.getReport !== 'function') { await ctx.reply('Health Monitor belum tersedia pada runtime ini.'); return; }
    const report = health.getReport();
    const action = String(ctx.args?.[0] || '').toLowerCase();
    const prefix = typeof ctx.prefix === 'string' ? ctx.prefix : '.';
    if (action === 'plugins') {
      await ctx.reply(['*PLUGIN HEALTH*', 'Total: ' + report.plugins.total, 'Aktif: ' + report.plugins.enabled, 'Nonaktif: ' + report.plugins.disabled, 'Command: ' + report.plugins.commands, 'Gagal dimuat saat startup: ' + report.plugins.skippedAtStartup].join('\n'));
      return;
    }
    if (action === 'memory') {
      await ctx.reply(['*MEMORY HEALTH*', 'RSS: ' + formatMb(report.memory.rssMb), 'Heap: ' + formatMb(report.memory.heapUsedMb) + ' / ' + formatMb(report.memory.heapTotalMb), 'Heap usage: ' + report.memory.heapUsagePercent + '%', 'External: ' + formatMb(report.memory.externalMb), 'Array buffers: ' + formatMb(report.memory.arrayBuffersMb)].join('\n'));
      return;
    }
    if (action === 'detail') { await ctx.reply(details(report)); return; }
    await ctx.reply(summary(report, prefix));
  }
};
