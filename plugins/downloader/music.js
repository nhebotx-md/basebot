'use strict';
const handler = require('./play.handler.cjs');
const plugin = {
  ...handler,
  name: 'downloader-music',
  commands: ['music'],
  category: 'downloader'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
