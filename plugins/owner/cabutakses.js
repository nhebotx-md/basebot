'use strict';
const handler = require('./user-access.handler.cjs');
const plugin = {
  ...handler,
  name: 'owner-cabutakses',
  commands: ['cabutakses'],
  category: 'owner'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
