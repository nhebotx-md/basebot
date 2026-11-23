'use strict';
const handler = require('./group-members.handler.cjs');
const plugin = {
  ...handler,
  name: 'group-anggota',
  commands: ['anggota'],
  category: 'group'
};
module.exports = plugin;
