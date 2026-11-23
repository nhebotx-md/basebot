'use strict';
const handler = require('./plugin-install.handler.cjs');
const plugin = { ...handler, name: 'owner-getplugin', commands: ['getplugin'], category: 'owner' };
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
