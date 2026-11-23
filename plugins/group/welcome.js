'use strict';
const handler = require('./welcome.handler.cjs');
const plugin = {
  ...handler,
  name: 'group-welcome',
  commands: ['welcome'],
  category: 'group'
};
module.exports = plugin;
