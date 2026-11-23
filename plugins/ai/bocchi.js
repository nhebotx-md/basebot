'use strict';
const handler = require('./bocchi.handler.cjs');
const plugin = {
  ...handler,
  name: 'ai-bocchi',
  commands: ['bocchi'],
  category: 'ai'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
