'use strict';
const handler = require('./sticker.handler.cjs');
const plugin = {
  ...handler,
  name: 'sticker-sticker',
  commands: ['sticker'],
  category: 'sticker'
};
module.exports = plugin;
