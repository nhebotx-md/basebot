'use strict';
const handler = require('./ytmp3.handler.cjs');
const plugin = {
  ...handler,
  name: 'downloader-ytmp3',
  commands: ['ytmp3'],
  category: 'downloader'
};
module.exports = plugin;
