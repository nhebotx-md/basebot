'use strict';
const handler = require('./voicechanger.handler.cjs');
const plugin = {
  ...handler,
  name: 'media-reverse',
  commands: ['reverse'],
  category: 'media'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
