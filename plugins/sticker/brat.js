'use strict';
const handler = require('./sticker-api.handler.cjs');
const plugin = {
  ...handler,
  name: 'sticker-brat',
  commands: ['brat'],
  category: 'sticker'
};
module.exports = plugin;
