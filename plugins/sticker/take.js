'use strict';
const handler = require('./sticker-watermark.handler.cjs');
const plugin = {
  ...handler,
  name: 'sticker-take',
  commands: ['take'],
  category: 'sticker'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
