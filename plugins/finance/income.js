'use strict';
const handler = require('./transactions.handler.cjs');
const plugin = {
  ...handler,
  name: 'finance-income',
  commands: ['income'],
  category: 'finance'
};
module.exports = plugin;
