'use strict';
const handler = require('./play.handler.cjs');
const plugin = {
  ...handler,
  name: 'downloader-song',
  commands: ['song'],
  category: 'downloader'
};
delete plugin.events;
delete plugin.onEvent;
module.exports = plugin;
