'use strict';

const fs = require('node:fs');
const path = require('node:path');
const packageInfo = require('../../package.json');
const { loadConfig } = require('../config/config-loader');
const { createLogger } = require('../core/services/logger.service');
const { PluginRegistry } = require('../core/plugins/plugin-registry');
const { findPluginFiles, loadPlugins } = require('../core/plugins/plugin-loader');
const { PluginManager } = require('../core/plugins/plugin-manager');
const { PluginWatchService } = require('../core/plugins/plugin-watch.service');
const { CommandDispatcher } = require('../core/messaging/command-dispatcher');
const { createMenuService } = require('../core/messaging/menu.service');
const { createConnectionManager } = require('../core/connection/connection-manager');
const { createClientFactory } = require('../integrations/whatsapp/client');
const { DatabaseService } = require('../core/database/database.service');
const { UserService } = require('../core/database/user.service');
const { GroupService } = require('../core/database/group.service');
const { PluginStateRepository } = require('../core/database/plugin-state.repository');
const { HealthService } = require('../core/services/health.service');
const { JobQueue } = require('../core/services/job-queue.service');
const { createDownloaderService } = require('../core/services/downloader.service');
const { SystemDoctorService } = require('../core/services/system-doctor.service');

async function createApp(options = {}) {
  const config = options.config || loadConfig();
  const logger = options.logger || createLogger({ level: config.logging.level, format: config.logging.format, colors: config.logging.color === 'always' ? true : config.logging.color === 'never' ? false : undefined, file: config.logging.fileEnabled ? { directory: config.paths.logs, filename: config.logging.fileName, maxBytes: config.logging.fileMaxBytes, maxFiles: config.logging.fileMaxFiles } : null });
  for (const directory of [config.paths.session, config.paths.temp, config.paths.logs, config.paths.database || './data/database']) fs.mkdirSync(path.resolve(directory), { recursive: true, mode: 0o700 });

  const startupDetails = {
    version: packageInfo.version,
    node: process.version,
    mode: config.publicMode ? 'public' : 'self',
    prefix: config.prefix,
    timezone: config.timezone,
    baileysLogLevel: config.logging.baileysLevel || 'warn',
    logLevel: config.logging.level || 'info',
    fileLogEnabled: config.logging.fileEnabled
  };
  if (typeof logger.startup === 'function') logger.startup({ name: config.botName, ...startupDetails });
  else logger.info('BASEBOT memulai runtime.', startupDetails);

  const database = options.database || await new DatabaseService({ directory: config.paths.database || './data/database', logger }).init();
  const users = options.users || new UserService({ database, expPerMessage: config.profile?.expPerMessage ?? 5, expCooldownMs: config.profile?.expCooldownMs ?? 60000 });
  const groups = options.groups || new GroupService({ database });
  const pluginStateRepository = options.pluginStateRepository || new PluginStateRepository({ database });

  const pluginDirectory = path.resolve(config.plugins.directory);
  const pluginFiles = findPluginFiles(pluginDirectory);
  const registry = new PluginRegistry({ logger });
  const loaded = loadPlugins({ directory: pluginDirectory, registry, logger, reload: config.plugins.reload });
  const disabledPlugins = await pluginStateRepository.getDisabledPlugins();
  for (const name of disabledPlugins) registry.disable(name);
  const pluginManager = new PluginManager({ registry, directory: pluginDirectory, logger, stateRepository: pluginStateRepository });
  const downloaderService = options.downloaderService || createDownloaderService(config.downloaders || {});
  registry.downloaderService = downloaderService;
  const pluginWatchService = new PluginWatchService({ manager: pluginManager, directory: pluginDirectory, logger, debounceMs: config.plugins.watchDebounceMs });
  pluginManager.watchService = pluginWatchService;
  registry.userService = users;
  registry.groupService = groups;
  registry.databaseService = database;
  registry.pluginManager = pluginManager;
  const activePlugins = registry.list({ includeDisabled: false });
  const commandCount = activePlugins.reduce((total, plugin) => total + plugin.commands.length, 0);
  const skippedFiles = Math.max(0, pluginFiles.length - loaded.length);
  if (typeof logger.plugins === 'function') logger.plugins({ discovered: pluginFiles.length, loaded: loaded.length, skipped: skippedFiles, commands: commandCount, plugins: activePlugins.map(plugin => plugin.name).sort() });
  if (skippedFiles) {
    logger.warn('Pemuatan plugin belum lengkap; plugin yang gagal tetap dicatat beserta penyebabnya.', {
      directory: path.relative(process.cwd(), pluginDirectory) || '.',
      discovered: pluginFiles.length,
      loaded: loaded.length,
      skipped: skippedFiles,
      commands: commandCount
    });
  } else if (typeof logger.plugins !== 'function') {
    logger.info('Plugin registry siap.', {
      directory: path.relative(process.cwd(), pluginDirectory) || '.',
      discovered: pluginFiles.length,
      loaded: loaded.length,
      skipped: 0,
      commands: commandCount,
      plugins: activePlugins.map(plugin => plugin.name).sort()
    });
  }
  if (pluginFiles.length === 0) logger.warn('Tidak ada file plugin yang ditemukan.', { directory: path.relative(process.cwd(), pluginDirectory) || '.' });

  const menuService = createMenuService({ registry, config, database, version: packageInfo.version, startedAt: Date.now() });
  registry.menuService = menuService;
  const jobQueue = new JobQueue({ concurrency: config.commandLimits?.maxConcurrent ?? 20, maxQueued: config.commandLimits?.maxQueued ?? 100 });
  registry.jobQueue = jobQueue;
  const dispatcher = new CommandDispatcher({ registry, logger, menuService, jobQueue, rateLimit: config.commandLimits?.rateLimit ?? 8, rateWindowMs: config.commandLimits?.rateWindowMs ?? 10000, maxConcurrentCommands: config.commandLimits?.maxConcurrent ?? 20, maxQueuedCommands: config.commandLimits?.maxQueued ?? 100 });
  const createClient = createClientFactory({ config, logger });
  const connection = createConnectionManager({ config, registry, dispatcher, logger, createClient, userService: users, groupService: groups });
  const healthService = new HealthService({ registry, connection, database, pluginManager, pluginWatchService, jobQueue, startupStats: { discovered: pluginFiles.length, loaded: loaded.length, skipped: skippedFiles, commands: commandCount } });
  registry.healthService = healthService;
  const doctorService = new SystemDoctorService({ config, database, registry, connection, pluginManager, downloaderService });
  registry.doctorService = doctorService;
  return {
    config,
    logger,
    registry,
    pluginManager,
    database,
    users,
    groups,
    dispatcher,
    connection,
    healthService,
    jobQueue,
    doctorService,
    pluginWatchService,
    async start() {
      if (config.plugins.autoReload !== false) pluginWatchService.start();
      await connection.start();
      logger.info('Runtime BASEBOT aktif; menunggu lifecycle WhatsApp.', { plugins: activePlugins.length, commands: commandCount });
    },
    async stop() {
      logger.info('Shutdown BASEBOT dimulai.');
      pluginWatchService.close();
      await jobQueue.close();
      healthService.stop();
      await connection.stop();
      await database.close();
      logger.info('Shutdown BASEBOT selesai.');
      await logger.close?.();
    }
  };
}

async function startApp(options) {
  const app = await createApp(options);
  const shutdown = signal => {
    app.logger.info('Shutdown terkontrol dimulai.', { signal });
    app.stop().then(() => process.exit(0)).catch(error => { app.logger.error('Shutdown gagal.', { error }); process.exit(1); });
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  await app.start();
  return app;
}

module.exports = { createApp, startApp };
