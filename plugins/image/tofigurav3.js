'use strict';
const handler = require('./ai-image-transform.handler.cjs');
const plugin = {
  ...handler,
  name: 'image-tofigurav3',
  commands: ['tofigurav3'],
  category: 'image'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
