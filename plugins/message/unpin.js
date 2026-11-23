'use strict';
const handler = require('./actions.handler.cjs');
const plugin = {
  ...handler,
  name: 'message-unpin',
  commands: ['unpin'],
  category: 'message'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
