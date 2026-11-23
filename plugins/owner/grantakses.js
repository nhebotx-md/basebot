'use strict';
const handler = require('./user-access.handler.cjs');
const plugin = {
  ...handler,
  name: 'owner-grantakses',
  commands: ['grantakses'],
  category: 'owner'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
