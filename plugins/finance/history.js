'use strict';
const handler = require('./transactions.handler.cjs');
const plugin = {
  ...handler,
  name: 'finance-history',
  commands: ['history'],
  category: 'finance'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
