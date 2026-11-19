'use strict';

const os = require('node:os');
const { monitorEventLoopDelay } = require('node:perf_hooks');

function finite(value, fallback = 0) { return Number.isFinite(value) ? value : fallback; }
function round(value, digits = 1) { const factor = 10 ** digits; return Math.round(finite(value) * factor) / factor; }
function bytesToMb(value) { return round(finite(value) / (1024 * 1024), 1); }

class HealthService {
  constructor({ registry, connection, database, pluginManager, pluginWatchService = null, jobQueue = null, startupStats = {}, startedAt = Date.now(), processInfo = process, osInfo = os, clock = Date.now, eventLoopMonitor = monitorEventLoopDelay, sampleIntervalMs = 30000, historyLimit = 120, alertLimit = 100 } = {}) {
    this.registry = registry;
    this.connection = connection;
    this.database = database;
    this.pluginManager = pluginManager;
    this.pluginWatchService = pluginWatchService;
    this.jobQueue = jobQueue;
    this.historyLimit = Math.max(10, Number(historyLimit) || 120);
    this.alertLimit = Math.max(10, Number(alertLimit) || 100);
    this.history = [];
    this.alerts = [];
    this.activeAlerts = new Set();
    this.previousStatus = null;
    this.startupStats = { ...startupStats };
    this.startedAt = startedAt;
    this.processInfo = processInfo;
    this.osInfo = osInfo;
    this.clock = clock;
    this.eventLoop = eventLoopMonitor({ resolution: 20 });
    this.eventLoop.enable();
    this.stopped = false;
    this.sampleTimer = setInterval(() => this.sample(), Math.max(5000, Number(sampleIntervalMs) || 30000));
    this.sampleTimer.unref?.();
    this.sample();
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    if (this.sampleTimer) clearInterval(this.sampleTimer);
    this.sampleTimer = null;
    this.eventLoop.disable();
  }

  addAlert(severity, message, report) {
    this.alerts.push({ at: report.generatedAt, severity, message });
    if (this.alerts.length > this.alertLimit) this.alerts.splice(0, this.alerts.length - this.alertLimit);
  }

  sample() {
    if (this.stopped) return null;
    const report = this.getReport();
    const item = { at: report.generatedAt, status: report.status, whatsapp: report.whatsapp.state, rssMb: report.memory.rssMb, heapUsagePercent: report.memory.heapUsagePercent, eventLoopP95Ms: report.eventLoopDelay.p95Ms, pendingWrites: report.database.pendingWrites, pluginsEnabled: report.plugins.enabled, pluginsTotal: report.plugins.total };
    this.history.push(item);
    if (this.history.length > this.historyLimit) this.history.splice(0, this.history.length - this.historyLimit);
    if (this.previousStatus && this.previousStatus !== report.status) this.addAlert(report.status === 'critical' ? 'critical' : report.status === 'degraded' ? 'warning' : 'info', 'Status runtime berubah: ' + this.previousStatus + ' → ' + report.status, report);
    this.previousStatus = report.status;
    const thresholds = [['heap', report.memory.heapUsagePercent >= 90, 'Heap usage mencapai 90% atau lebih.'], ['event-loop', report.eventLoopDelay.p95Ms >= 250, 'Event-loop p95 mencapai 250 ms atau lebih.'], ['database', report.database.pendingWrites >= 100, 'Antrean write database mencapai 100 operasi atau lebih.']];
    for (const [key, active, message] of thresholds) {
      if (active && !this.activeAlerts.has(key)) { this.activeAlerts.add(key); this.addAlert('warning', message, report); }
      else if (!active && this.activeAlerts.has(key)) { this.activeAlerts.delete(key); this.addAlert('info', 'Pulih: ' + message, report); }
    }
    return item;
  }

  getHistory(limit = 10) { return this.history.slice(-Math.max(1, Math.min(60, Number(limit) || 10))).reverse(); }
  getAlerts(limit = 10) { return this.alerts.slice(-Math.max(1, Math.min(50, Number(limit) || 10))).reverse(); }

  getReport() {
    const now = this.clock();
    const processMemory = this.processInfo.memoryUsage();
    const connection = this.connection?.status || {};
    const databaseStatus = typeof this.database?.status === 'function' ? this.database.status() : { initialized: false, schemaVersion: null, collections: [] };
    let pluginStats = { total: 0, enabled: 0, disabled: 0, commands: 0, categories: 0 };
    let pluginStatsError = false;
    try {
      if (this.pluginManager?.stats) pluginStats = this.pluginManager.stats();
      else {
        const plugins = this.registry?.list?.() || [];
        const enabled = plugins.filter(plugin => this.registry.isEnabled(plugin.name));
        pluginStats = { total: plugins.length, enabled: enabled.length, disabled: plugins.length - enabled.length, commands: enabled.reduce((sum, plugin) => sum + plugin.commands.length, 0), categories: new Set(plugins.map(plugin => plugin.category)).size };
      }
    } catch { pluginStatsError = true; }

    const whatsappState = connection.state || (this.connection?.client ? 'connected' : 'disconnected');
    const databaseReady = databaseStatus.initialized === true && databaseStatus.closed !== true && this.database?.closed !== true;
    const skippedPlugins = Math.max(0, Number(this.startupStats.skipped) || 0);
    const pluginWatch = this.pluginWatchService?.status?.() || { enabled: false, watchingDirectories: 0, pending: false, reloads: 0, failures: 0 };
    const memory = {
      rssMb: bytesToMb(processMemory.rss),
      heapUsedMb: bytesToMb(processMemory.heapUsed),
      heapTotalMb: bytesToMb(processMemory.heapTotal),
      externalMb: bytesToMb(processMemory.external),
      arrayBuffersMb: bytesToMb(processMemory.arrayBuffers)
    };
    const heapUsagePercent = processMemory.heapTotal > 0 ? round((processMemory.heapUsed / processMemory.heapTotal) * 100, 1) : 0;
    const eventLoopDelay = {
      p50Ms: round(finite(this.eventLoop.percentile(50)) / 1e6, 2),
      p95Ms: round(finite(this.eventLoop.percentile(95)) / 1e6, 2),
      maxMs: round(finite(this.eventLoop.max) / 1e6, 2)
    };
    const loadAverage = this.osInfo.loadavg().map(value => round(value, 2));
    const checks = [
      { name: 'WhatsApp', status: whatsappState === 'open' ? 'healthy' : 'degraded', detail: whatsappState },
      { name: 'Database', status: databaseReady ? 'healthy' : 'critical', detail: databaseReady ? 'ready' : 'unavailable' },
      { name: 'Plugin registry', status: pluginStatsError || skippedPlugins > 0 ? 'degraded' : 'healthy', detail: pluginStatsError ? 'stats-unavailable' : skippedPlugins > 0 ? 'load-errors' : 'ready' }
    ];
    const overall = checks.some(check => check.status === 'critical') ? 'critical' : checks.some(check => check.status === 'degraded') ? 'degraded' : 'healthy';

    return {
      generatedAt: new Date(now).toISOString(),
      status: overall,
      uptimeSeconds: Math.max(0, Math.floor((now - this.startedAt) / 1000)),
      runtime: { node: this.processInfo.version, platform: this.processInfo.platform, arch: this.processInfo.arch, pid: this.processInfo.pid, processUptimeSeconds: Math.floor(this.processInfo.uptime()), loadAverage },
      whatsapp: { state: whatsappState, connected: whatsappState === 'open', reconnectAttempts: Math.max(0, Number(connection.reconnectAttempts) || 0), lastConnectedAt: connection.lastConnectedAt ? new Date(connection.lastConnectedAt).toISOString() : null },
      database: { ready: databaseReady, schemaVersion: databaseStatus.schemaVersion ?? null, collections: Array.isArray(databaseStatus.collections) ? [...databaseStatus.collections] : [], pendingWrites: Math.max(0, Number(this.database?.pendingWrites) || 0) },
      jobs: this.jobQueue?.stats?.() || { active: 0, queued: 0, concurrency: 0, maxQueued: 0 },
      plugins: { ...pluginStats, skippedAtStartup: skippedPlugins, discoveredAtStartup: Math.max(0, Number(this.startupStats.discovered) || 0), loadedAtStartup: Math.max(0, Number(this.startupStats.loaded) || 0), autoReload: pluginWatch },
      memory: { ...memory, heapUsagePercent },
      eventLoopDelay,
      checks
    };
  }
}

module.exports = { HealthService, bytesToMb, round };
