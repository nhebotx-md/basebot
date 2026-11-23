'use strict';
const handler = require('./group-requests.handler.cjs');
const plugin = {
  ...handler,
  name: 'group-permintaanmasuk',
  commands: ['permintaanmasuk'],
  category: 'group'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
