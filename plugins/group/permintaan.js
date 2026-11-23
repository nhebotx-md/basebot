'use strict';
const handler = require('./group-request-action.handler.cjs');
const plugin = {
  ...handler,
  name: 'group-permintaan',
  commands: ['permintaan'],
  category: 'group'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
