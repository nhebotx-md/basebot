'use strict';
const handler = require('./voicechanger.handler.cjs');
const plugin = {
  ...handler,
  name: 'media-nightcore',
  commands: ['nightcore'],
  category: 'media'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
