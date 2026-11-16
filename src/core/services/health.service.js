'use strict';

const os = require('node:os');
const { monitorEventLoopDelay } = require('node:perf_hooks');

function finite(value, fallback = 0) { return Number.isFinite(value) ? value : fallback; }
function round(value, digits = 1) { const factor = 10 ** digits; return Math.round(finite(value) * factor) / factor; }
function bytesToMb(value) { return round(finite(value) / (1024 * 1024), 1); }

class HealthService {
  constructor({ registry, connection, database, pluginManager, startupStats = {}, startedAt = Date.now(), processInfo = process, osInfo = os, clock = Date.now, eventLoopMonitor = monitorEventLoopDelay } = {}) {
    this.registry = registry;
    this.connection = connection;
    this.database = database;
    this.pluginManager = pluginManager;
    this.startupStats = { ...startupStats };
    this.startedAt = startedAt;
    this.processInfo = processInfo;
    this.osInfo = osInfo;
    this.clock = clock;
    this.eventLoop = eventLoopMonitor({ resolution: 20 });
    this.eventLoop.enable();
    this.stopped = false;
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    this.eventLoop.disable();
  }

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
      plugins: { ...pluginStats, skippedAtStartup: skippedPlugins, discoveredAtStartup: Math.max(0, Number(this.startupStats.discovered) || 0), loadedAtStartup: Math.max(0, Number(this.startupStats.loaded) || 0) },
      memory: { ...memory, heapUsagePercent },
      eventLoopDelay,
      checks
    };
  }
}

module.exports = { HealthService, bytesToMb, round };
