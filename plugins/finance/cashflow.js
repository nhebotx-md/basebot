'use strict';
const handler = require('./planning.handler.cjs');
const plugin = {
  ...handler,
  name: 'finance-cashflow',
  commands: ['cashflow'],
  category: 'finance'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
