'use strict';

const fs = require('node:fs');
const path = require('node:path');
const packageInfo = require('../package.json');
const { loadConfig } = require('./config/config-loader');
const { createLogger } = require('./core/services/logger.service');
const { PluginRegistry } = require('./core/plugins/plugin-registry');
const { findPluginFiles, loadPlugins } = require('./core/plugins/plugin-loader');
const { CommandDispatcher } = require('./core/messaging/command-dispatcher');
const { createConnectionManager } = require('./core/connection/connection-manager');

async function createApp(options = {}) {
  const config = options.config || loadConfig();
  const logger = options.logger || createLogger({ level: config.logging.level });
  for (const directory of [config.paths.session, config.paths.temp, config.paths.logs]) fs.mkdirSync(path.resolve(directory), { recursive: true, mode: 0o700 });

  logger.info('BASEBOT memulai runtime.', {
    version: packageInfo.version,
    node: process.version,
    mode: config.publicMode ? 'public' : 'self',
    prefix: config.prefix,
    timezone: config.timezone,
    baileysLogLevel: config.logging.baileysLevel || 'warn'
  });

  const pluginDirectory = path.resolve(config.plugins.directory);
  const pluginFiles = findPluginFiles(pluginDirectory);
  const registry = new PluginRegistry({ logger });
  const loaded = loadPlugins({ directory: pluginDirectory, registry, logger, reload: config.plugins.reload });
  const activePlugins = registry.list({ includeDisabled: false });
  const commandCount = activePlugins.reduce((total, plugin) => total + plugin.commands.length, 0);
  const skippedFiles = Math.max(0, pluginFiles.length - loaded.length);
  if (skippedFiles) {
    logger.warn('Pemuatan plugin belum lengkap; plugin yang gagal tetap dicatat beserta penyebabnya.', {
      directory: path.relative(process.cwd(), pluginDirectory) || '.',
      discovered: pluginFiles.length,
      loaded: loaded.length,
      skipped: skippedFiles,
      commands: commandCount
    });
  } else {
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

  const dispatcher = new CommandDispatcher({ registry, logger });
  const connection = createConnectionManager({ config, registry, dispatcher, logger });
  return {
    config,
    logger,
    registry,
    dispatcher,
    connection,
    async start() {
      await connection.start();
      logger.info('Runtime BASEBOT aktif; menunggu lifecycle WhatsApp.', { plugins: activePlugins.length, commands: commandCount });
    },
    async stop() {
      logger.info('Shutdown BASEBOT dimulai.');
      await connection.stop();
      logger.info('Shutdown BASEBOT selesai.');
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
