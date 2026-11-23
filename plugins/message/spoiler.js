'use strict';
const handler = require('./message-wrappers.handler.cjs');
const plugin = {
  ...handler,
  name: 'message-spoiler',
  commands: ['spoiler'],
  category: 'message'
};
module.exports = plugin;
