'use strict';
const handler = require('./actions.handler.cjs');
const plugin = {
  ...handler,
  name: 'message-react',
  commands: ['react'],
  category: 'message'
};
module.exports = plugin;
