'use strict';
const handler = require('./facebook.handler.cjs');
const plugin = {
  ...handler,
  name: 'downloader-fbvideo',
  commands: ['fbvideo'],
  category: 'downloader'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
