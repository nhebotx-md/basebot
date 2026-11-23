'use strict';
const handler = require('./plugin-install.handler.cjs');
module.exports = { ...handler, name: 'owner-addplugin', commands: ['addplugin'], category: 'owner' };
