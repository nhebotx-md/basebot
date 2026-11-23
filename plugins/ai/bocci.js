'use strict';
const handler = require('./bocchi.handler.cjs');
const plugin = {
  ...handler,
  name: 'ai-bocci',
  commands: ['bocci'],
  category: 'ai'
};
module.exports = plugin;
