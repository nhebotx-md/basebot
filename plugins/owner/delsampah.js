'use strict';
const handler = require('./delsampah.handler.cjs');
const plugin = {
  ...handler,
  name: 'owner-delsampah',
  commands: ['delsampah'],
  category: 'owner'
};
module.exports = plugin;
