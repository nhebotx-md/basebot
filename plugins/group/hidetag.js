'use strict';
const handler = require('./hidetag.handler.cjs');
const plugin = {
  ...handler,
  name: 'group-hidetag',
  commands: ['hidetag'],
  category: 'group'
};
module.exports = plugin;
