'use strict';
const handler = require('./download-tiktok.handler.cjs');
const plugin = {
  ...handler,
  name: 'downloader-tiktok',
  commands: ['tiktok', 'tt'],
  category: 'downloader'
};
module.exports = plugin;
