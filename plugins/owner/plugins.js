'use strict';
const handler = require('./plugin-manager.handler.cjs');
const plugin = {
  ...handler,
  name: 'owner-plugins',
  commands: ['plugins'],
  category: 'owner'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
