'use strict';
const handler = require('./sticker-api.handler.cjs');
const plugin = {
  ...handler,
  name: 'sticker-bratvid',
  commands: ['bratvid'],
  category: 'sticker'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
