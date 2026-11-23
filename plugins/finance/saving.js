'use strict';
const handler = require('./planning.handler.cjs');
const plugin = {
  ...handler,
  name: 'finance-saving',
  commands: ['saving'],
  category: 'finance'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
