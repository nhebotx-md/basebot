'use strict';
const handler = require('./group-settings.handler.cjs');
const plugin = {
  ...handler,
  name: 'group-groupconfig',
  commands: ['groupconfig'],
  category: 'group'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
