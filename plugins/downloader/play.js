'use strict';
const handler = require('./play.handler.cjs');
const plugin = {
  ...handler,
  name: 'downloader-play',
  commands: ['play'],
  category: 'downloader'
};
module.exports = plugin;
