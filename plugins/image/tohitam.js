'use strict';
const handler = require('./ai-image-transform.handler.cjs');
const plugin = {
  ...handler,
  name: 'image-tohitam',
  commands: ['tohitam'],
  category: 'image'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
