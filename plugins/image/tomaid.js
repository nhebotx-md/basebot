'use strict';
const handler = require('./ai-image-transform.handler.cjs');
const plugin = {
  ...handler,
  name: 'image-tomaid',
  commands: ['tomaid'],
  category: 'image'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
