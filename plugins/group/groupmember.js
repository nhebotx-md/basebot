'use strict';
const handler = require('./group-members.handler.cjs');
const plugin = {
  ...handler,
  name: 'group-groupmember',
  commands: ['groupmember'],
  category: 'group'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
