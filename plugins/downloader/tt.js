'use strict';
const handler = require('./download-tiktok.handler.cjs');
const plugin = {
  ...handler,
  name: 'downloader-tt',
  commands: ['tt'],
  category: 'downloader'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
