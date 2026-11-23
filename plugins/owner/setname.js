'use strict';
const handler = require('./account-tools.handler.cjs');
const plugin = {
  ...handler,
  name: 'owner-setname',
  commands: ['setname'],
  category: 'owner'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
