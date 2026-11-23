'use strict';
const handler = require('./sticker-api.handler.cjs');
const plugin = {
  ...handler,
  name: 'sticker-stapi',
  commands: ['stapi'],
  category: 'sticker'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
