'use strict';
const handler = require('./profile.handler.cjs');
const plugin = {
  ...handler,
  name: 'account-me',
  commands: ['me'],
  category: 'account'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
