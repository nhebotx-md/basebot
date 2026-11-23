'use strict';
const handler = require('./voicechanger.handler.cjs');
const plugin = {
  ...handler,
  name: 'media-bass',
  commands: ['bass'],
  category: 'media'
};
module.exports = plugin;
