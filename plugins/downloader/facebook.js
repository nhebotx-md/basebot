'use strict';
const handler = require('./facebook.handler.cjs');
const plugin = {
  ...handler,
  name: 'downloader-facebook',
  commands: ['facebook'],
  category: 'downloader'
};
module.exports = plugin;
