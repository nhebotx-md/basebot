'use strict';
const handler = require('./account-tools.handler.cjs');
const plugin = {
  ...handler,
  name: 'owner-setbio',
  commands: ['setbio'],
  category: 'owner'
};
module.exports = plugin;
