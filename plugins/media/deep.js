'use strict';
const handler = require('./voicechanger.handler.cjs');
const plugin = {
  ...handler,
  name: 'media-deep',
  commands: ['deep'],
  category: 'media'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
