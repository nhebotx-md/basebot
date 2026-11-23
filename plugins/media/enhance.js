'use strict';
const handler = require('./image-enhancer.handler.cjs');
const plugin = {
  ...handler,
  name: 'media-enhance',
  commands: ['enhance'],
  category: 'media'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
