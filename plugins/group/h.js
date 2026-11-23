'use strict';
const handler = require('./hidetag.handler.cjs');
const plugin = {
  ...handler,
  name: 'group-h',
  commands: ['h'],
  category: 'group'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
