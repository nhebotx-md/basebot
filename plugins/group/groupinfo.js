'use strict';
const handler = require('./group-info.handler.cjs');
const plugin = {
  ...handler,
  name: 'group-groupinfo',
  commands: ['groupinfo'],
  category: 'group'
};
module.exports = plugin;
