'use strict';
const handler = require('./ai-image-transform.handler.cjs');
const plugin = {
  ...handler,
  name: 'image-tofigurav2',
  commands: ['tofigurav2'],
  category: 'image'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
