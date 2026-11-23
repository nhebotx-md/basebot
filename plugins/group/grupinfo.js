'use strict';
const handler = require('./group-info.handler.cjs');
const plugin = {
  ...handler,
  name: 'group-grupinfo',
  commands: ['grupinfo'],
  category: 'group'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
