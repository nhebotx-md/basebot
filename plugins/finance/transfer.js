'use strict';
const handler = require('./transactions.handler.cjs');
const plugin = {
  ...handler,
  name: 'finance-transfer',
  commands: ['transfer'],
  category: 'finance'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
