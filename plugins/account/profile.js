'use strict';
const handler = require('./profile.handler.cjs');
const plugin = {
  ...handler,
  name: 'account-profile',
  commands: ['profile'],
  category: 'account'
};
module.exports = plugin;
