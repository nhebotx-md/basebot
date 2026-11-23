'use strict';
const handler = require('./anti-status-mention.handler.cjs');
const plugin = {
  ...handler,
  name: 'group-antitagsw',
  commands: ['antitagsw'],
  category: 'group'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
