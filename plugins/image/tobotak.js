'use strict';
const handler = require('./ai-image-transform.handler.cjs');
const plugin = {
  ...handler,
  name: 'image-tobotak',
  commands: ['tobotak'],
  category: 'image'
};
module.exports = plugin;
