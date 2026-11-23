'use strict';
const handler = require('./facebook.handler.cjs');
const plugin = {
  ...handler,
  name: 'downloader-fbdl',
  commands: ['fbdl'],
  category: 'downloader'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
