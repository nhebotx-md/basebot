'use strict';
const handler = require('./idgc.handler.cjs');
const plugin = {
  ...handler,
  name: 'tools-idgc',
  commands: ['idgc'],
  category: 'tools'
};
module.exports = plugin;
