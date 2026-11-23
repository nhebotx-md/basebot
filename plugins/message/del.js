'use strict';
const handler = require('./actions.handler.cjs');
const plugin = {
  ...handler,
  name: 'message-del',
  commands: ['del'],
  category: 'message'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
