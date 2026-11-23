'use strict';
const handler = require('./actions.handler.cjs');
const plugin = {
  ...handler,
  name: 'message-edit',
  commands: ['edit'],
  category: 'message'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
