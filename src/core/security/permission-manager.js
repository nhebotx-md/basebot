'use strict';

function normalizeIdentity(value, decodeJid = jid => jid) {
  if (typeof value !== 'string' || !value) return '';
  let decoded = value;
  try { decoded = decodeJid(value) || value; } catch { /* pertahankan input */ }
  const [user, server = 's.whatsapp.net'] = decoded.split('@');
  if (!user) return '';
  return `${user.split(':')[0]}@${server}`.toLowerCase();
}

function validatePermission(plugin, context) {
  const permission = plugin.permissions || {};
  if (permission.ownerOnly && !context.isOwner) return { allowed: false, reason: 'owner' };
  if (permission.groupOnly && !context.isGroup) return { allowed: false, reason: 'group' };
  if (permission.privateOnly && !context.isPrivate) return { allowed: false, reason: 'private' };
  if (permission.adminOnly && !context.isGroupAdmin && !(context.isOwner && permission.ownerAdminBypass !== false)) return { allowed: false, reason: 'admin' };
  if (permission.botAdminOnly && !context.isBotAdmin) return { allowed: false, reason: 'bot-admin' };
  if ((permission.restricted || context.publicMode === false) && !context.isOwner) return { allowed: false, reason: 'restricted' };
  return { allowed: true };
}

module.exports = { normalizeIdentity, validatePermission };
