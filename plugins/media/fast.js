'use strict';
const handler = require('./voicechanger.handler.cjs');
const plugin = {
  ...handler,
  name: 'media-fast',
  commands: ['fast'],
  category: 'media'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
