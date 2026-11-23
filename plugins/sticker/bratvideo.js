'use strict';
const handler = require('./sticker-api.handler.cjs');
const plugin = {
  ...handler,
  name: 'sticker-bratvideo',
  commands: ['bratvideo'],
  category: 'sticker'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
