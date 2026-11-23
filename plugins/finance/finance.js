'use strict';
const handler = require('./planning.handler.cjs');
const plugin = {
  ...handler,
  name: 'finance-finance',
  commands: ['finance'],
  category: 'finance'
};
module.exports = plugin;
