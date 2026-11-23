'use strict';
const handler = require('./clearsesion.handler.cjs');
const plugin = {
  ...handler,
  name: 'owner-clearsesi',
  commands: ['clearsesi'],
  category: 'owner'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
