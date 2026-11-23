'use strict';
const handler = require('./welcome.handler.cjs');
const plugin = {
  ...handler,
  name: 'group-welcome-status',
  commands: ['welcome-status'],
  category: 'group'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
