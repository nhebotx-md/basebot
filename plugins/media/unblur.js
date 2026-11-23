'use strict';
const handler = require('./image-enhancer.handler.cjs');
const plugin = {
  ...handler,
  name: 'media-unblur',
  commands: ['unblur'],
  category: 'media'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
