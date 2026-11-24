'use strict';
const handler = require('./download-tiktok.handler.cjs');
const plugin = {
  ...handler,
  name: 'downloader-tiktok',
  commands: ['tiktok'],
  category: 'downloader'
};
module.exports = plugin;
