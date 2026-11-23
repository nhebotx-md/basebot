'use strict';
const handler = require('./getplugin.handler.cjs');
module.exports = { ...handler, name: 'owner-getplugin', commands: ['getplugin'], category: 'owner' };
