'use strict';
const handler = require('./idch.handler.cjs');
const plugin = {
  ...handler,
  name: 'tools-idch',
  commands: ['idch'],
  category: 'tools'
};
module.exports = plugin;
