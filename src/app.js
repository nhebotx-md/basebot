'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { loadConfig } = require('./config/config-loader');
const { createLogger } = require('./core/services/logger.service');
const { PluginRegistry } = require('./core/plugins/plugin-registry');
const { loadPlugins } = require('./core/plugins/plugin-loader');
const { CommandDispatcher } = require('./core/messaging/command-dispatcher');
const { createConnectionManager } = require('./core/connection/connection-manager');

async function createApp(options = {}) {
  const config = options.config || loadConfig();
  const logger = options.logger || createLogger({ level: config.logging.level });
  for (const directory of [config.paths.session, config.paths.temp, config.paths.logs]) fs.mkdirSync(path.resolve(directory), { recursive: true, mode: 0o700 });
  const registry = new PluginRegistry({ logger });
  const loaded = loadPlugins({ directory: config.plugins.directory, registry, logger, reload: config.plugins.reload });
  logger.info('Plugin terdaftar.', { count: loaded.length, commands: registry.list({ includeDisabled: false }).reduce((total, item) => total + item.commands.length, 0) });
  const dispatcher = new CommandDispatcher({ registry, logger });
  const connection = createConnectionManager({ config, registry, dispatcher, logger });
  return { config, logger, registry, dispatcher, connection, async start() { await connection.start(); }, async stop() { await connection.stop(); } };
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
