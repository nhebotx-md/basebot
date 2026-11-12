'use strict';

const COMMAND_PATTERN = /^[\p{L}\p{N}_-]{1,40}$/u;
const PERMISSION_KEYS = ['ownerOnly', 'groupOnly', 'privateOnly', 'adminOnly', 'botAdminOnly', 'restricted', 'ownerAdminBypass'];

function validatePlugin(plugin, filePath = '<unknown>') {
  const errors = [];
  if (!plugin || typeof plugin !== 'object' || Array.isArray(plugin)) return { valid: false, errors: [`${filePath}: plugin harus mengekspor object.`] };
  if (typeof plugin.name !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(plugin.name)) errors.push('name wajib berupa identifier 1-64 karakter.');
  if (!Array.isArray(plugin.commands) || plugin.commands.length === 0) errors.push('commands wajib berupa array yang tidak kosong.');
  else {
    const local = new Set();
    for (const command of plugin.commands) {
      if (typeof command !== 'string' || !COMMAND_PATTERN.test(command)) errors.push(`command tidak valid: ${String(command)}.`);
      else if (local.has(command.toLowerCase())) errors.push(`command lokal duplikat: ${command}.`);
      local.add(typeof command === 'string' ? command.toLowerCase() : String(command));
    }
  }
  if (typeof plugin.category !== 'string' || !plugin.category.trim()) errors.push('category wajib berupa teks.');
  if (typeof plugin.description !== 'string' || !plugin.description.trim()) errors.push('description wajib berupa teks.');
  if (typeof plugin.usage !== 'string' || !plugin.usage.trim()) errors.push('usage wajib berupa teks.');
  if (typeof plugin.execute !== 'function') errors.push('execute(ctx) wajib berupa function.');
  const permissions = plugin.permissions === undefined ? {} : plugin.permissions;
  if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) errors.push('permissions harus berupa object.');
  else for (const key of Object.keys(permissions)) {
    if (!PERMISSION_KEYS.includes(key)) errors.push(`permission tidak dikenal: ${key}.`);
    else if (typeof permissions[key] !== 'boolean') errors.push(`permissions.${key} harus boolean.`);
  }
  if (plugin.events !== undefined && (!Array.isArray(plugin.events) || plugin.events.some(event => typeof event !== 'string'))) errors.push('events harus berupa array nama event.');
  if (plugin.onEvent !== undefined && typeof plugin.onEvent !== 'function') errors.push('onEvent harus berupa function.');
  if (plugin.events?.length && typeof plugin.onEvent !== 'function') errors.push('plugin event wajib menyediakan onEvent(ctx, event).');
  return { valid: errors.length === 0, errors: errors.map(error => `${filePath}: ${error}`) };
}

module.exports = { validatePlugin };
