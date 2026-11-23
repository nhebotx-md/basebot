'use strict';
const handler = require('./sampah.handler.cjs');
const plugin = {
  ...handler,
  name: 'owner-listsampah',
  commands: ['listsampah'],
  category: 'owner'
};
module.exports = plugin;
