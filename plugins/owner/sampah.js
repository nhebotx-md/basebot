'use strict';
const handler = require('./sampah.handler.cjs');
const plugin = {
  ...handler,
  name: 'owner-sampah',
  commands: ['sampah'],
  category: 'owner'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
