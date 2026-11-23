'use strict';
const handler = require('./plugin-manager.handler.cjs');
const plugin = {
  ...handler,
  name: 'owner-plugin',
  commands: ['plugin'],
  category: 'owner'
};
module.exports = plugin;
