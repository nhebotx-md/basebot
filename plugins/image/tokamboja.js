'use strict';
const handler = require('./ai-image-transform.handler.cjs');
const plugin = {
  ...handler,
  name: 'image-tokamboja',
  commands: ['tokamboja'],
  category: 'image'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
