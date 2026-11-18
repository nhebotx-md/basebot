'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const plugin = require('../../plugins/group/anti-status-mention');

test('PatrickMD anti-status-mention commands share one group plugin and permission boundary', () => {
  assert.deepEqual(plugin.commands, ['antiswgc', 'antitagsw']);
  assert.equal(plugin.category, 'group');
  assert.equal(plugin.permissions.groupOnly, true);
  assert.equal(plugin.permissions.adminOnly, true);
  assert.equal(plugin.permissions.botAdminOnly, true);
});
