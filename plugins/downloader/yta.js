'use strict';
const handler = require('./ytmp3.handler.cjs');
const plugin = {
  ...handler,
  name: 'downloader-yta',
  commands: ['yta'],
  category: 'downloader'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
