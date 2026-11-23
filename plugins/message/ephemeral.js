'use strict';
const handler = require('./message-wrappers.handler.cjs');
const plugin = {
  ...handler,
  name: 'message-ephemeral',
  commands: ['ephemeral'],
  category: 'message'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
