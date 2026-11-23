'use strict';
const handler = require('./voicechanger.handler.cjs');
const plugin = {
  ...handler,
  name: 'media-fat',
  commands: ['fat'],
  category: 'media'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
