'use strict';
const handler = require('./group-requests.handler.cjs');
const plugin = {
  ...handler,
  name: 'group-joinrequests',
  commands: ['joinrequests'],
  category: 'group'
};
module.exports = plugin;
