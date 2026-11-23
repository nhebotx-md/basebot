'use strict';
const handler = require('./account-tools.handler.cjs');
const plugin = {
  ...handler,
  name: 'owner-listgc',
  commands: ['listgc'],
  category: 'owner'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
