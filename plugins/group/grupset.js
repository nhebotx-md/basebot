'use strict';
const handler = require('./group-settings.handler.cjs');
const plugin = {
  ...handler,
  name: 'group-grupset',
  commands: ['grupset'],
  category: 'group'
};
module.exports = plugin;
