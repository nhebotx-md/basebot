'use strict';
const handler = require('./planning.handler.cjs');
const plugin = {
  ...handler,
  name: 'finance-budgetcheck',
  commands: ['budgetcheck'],
  category: 'finance'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
