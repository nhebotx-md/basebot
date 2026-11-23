'use strict';
const handler = require('./sticker-watermark.handler.cjs');
const plugin = {
  ...handler,
  name: 'sticker-wm',
  commands: ['wm'],
  category: 'sticker'
};
module.exports = plugin;
