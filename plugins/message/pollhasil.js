'use strict';
const handler = require('./poll.handler.cjs');
const plugin = {
  ...handler,
  name: 'message-pollhasil',
  commands: ['pollhasil'],
  category: 'message'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
