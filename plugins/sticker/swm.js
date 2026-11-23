'use strict';
const handler = require('./sticker-watermark.handler.cjs');
const plugin = {
  ...handler,
  name: 'sticker-swm',
  commands: ['swm'],
  category: 'sticker'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
