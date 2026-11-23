'use strict';
const handler = require('./idch.handler.cjs');
const plugin = {
  ...handler,
  name: 'tools-cekidch',
  commands: ['cekidch'],
  category: 'tools'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
