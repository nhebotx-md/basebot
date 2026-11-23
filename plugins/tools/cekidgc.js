'use strict';
const handler = require('./idgc.handler.cjs');
const plugin = {
  ...handler,
  name: 'tools-cekidgc',
  commands: ['cekidgc'],
  category: 'tools'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
