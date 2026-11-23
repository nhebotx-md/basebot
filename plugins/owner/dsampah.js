'use strict';
const handler = require('./delsampah.handler.cjs');
const plugin = {
  ...handler,
  name: 'owner-dsampah',
  commands: ['dsampah'],
  category: 'owner'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
