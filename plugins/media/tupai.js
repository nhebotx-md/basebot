'use strict';
const handler = require('./voicechanger.handler.cjs');
const plugin = {
  ...handler,
  name: 'media-tupai',
  commands: ['tupai'],
  category: 'media'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
