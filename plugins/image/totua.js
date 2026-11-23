'use strict';
const handler = require('./ai-image-transform.handler.cjs');
const plugin = {
  ...handler,
  name: 'image-totua',
  commands: ['totua'],
  category: 'image'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
