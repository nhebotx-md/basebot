'use strict';
const handler = require('./poll.handler.cjs');
const plugin = {
  ...handler,
  name: 'message-poll',
  commands: ['poll'],
  category: 'message'
};
module.exports = plugin;
