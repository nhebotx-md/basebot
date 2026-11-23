'use strict';
const handler = require('./ytmp3.handler.cjs');
const plugin = {
  ...handler,
  name: 'downloader-ytmp3api',
  commands: ['ytmp3api'],
  category: 'downloader'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
