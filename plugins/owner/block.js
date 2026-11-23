'use strict';
const handler = require('./account-tools.handler.cjs');
const plugin = {
  ...handler,
  name: 'owner-block',
  commands: ['block'],
  category: 'owner'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
