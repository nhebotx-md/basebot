'use strict';
const handler = require('./planning.handler.cjs');
const plugin = {
  ...handler,
  name: 'finance-monthly',
  commands: ['monthly'],
  category: 'finance'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
