'use strict';
const handler = require('./group-request-action.handler.cjs');
const plugin = {
  ...handler,
  name: 'group-joinrequest',
  commands: ['joinrequest'],
  category: 'group'
};
module.exports = plugin;
