'use strict';
const handler = require('./anti-status-mention.handler.cjs');
const plugin = {
  ...handler,
  name: 'group-antiswgc',
  commands: ['antiswgc'],
  category: 'group'
};
module.exports = plugin;
