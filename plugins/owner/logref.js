'use strict';
const handler = require('./logref.handler.cjs');
module.exports = { ...handler, name: 'owner-logref', commands: ['logref'], category: 'owner' };
