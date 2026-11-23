'use strict';
const handler = require('./user-access.handler.cjs');
const plugin = {
  ...handler,
  name: 'owner-setrole',
  commands: ['setrole'],
  category: 'owner'
};
module.exports = plugin;
