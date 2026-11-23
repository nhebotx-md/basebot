'use strict';
const handler = require('./sticker.handler.cjs');
const plugin = {
  ...handler,
  name: 'sticker-s',
  commands: ['s'],
  category: 'sticker'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
