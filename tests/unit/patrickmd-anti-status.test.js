'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const antiswgc = require('../../plugins/group/antiswgc');
const antitagsw = require('../../plugins/group/antitagsw');

test('anti-status command aliases are independent group plugins with the same permission boundary', () => {
  for (const plugin of [antiswgc, antitagsw]) {
    assert.equal(plugin.commands.length, 1);
    assert.equal(plugin.category, 'group');
    assert.equal(plugin.permissions.groupOnly, true);
    assert.equal(plugin.permissions.adminOnly, true);
    assert.equal(plugin.permissions.botAdminOnly, true);
  }
});
