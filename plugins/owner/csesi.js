'use strict';
const handler = require('./clearsesion.handler.cjs');
const plugin = {
  ...handler,
  name: 'owner-csesi',
  commands: ['csesi'],
  category: 'owner'
};
module.exports = plugin;
