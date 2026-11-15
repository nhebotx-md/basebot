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
  const category = String(plugin.category || '').trim().toLowerCase();
  // Sensitive categories fail closed even if a plugin forgot its explicit flag.
  const ownerOnly = permission.ownerOnly === true || category === 'owner';
  const inferredGroupAdmin = category === 'group' && !ownerOnly;
  const groupOnly = permission.groupOnly === true || inferredGroupAdmin;
  const adminOnly = permission.adminOnly === true || inferredGroupAdmin;
  // Owner-only is an identity boundary, never an admin-group privilege.
  if (ownerOnly && !context.isOwner) return { allowed: false, reason: 'owner' };
  // Group/private flags define where a command can run, not who owns the bot.
  if (groupOnly && !context.isGroup) return { allowed: false, reason: 'group' };
  if (permission.privateOnly && !context.isPrivate) return { allowed: false, reason: 'private' };
  if (adminOnly && !context.isGroup) return { allowed: false, reason: 'group' };
  if (adminOnly && !context.isGroupAdmin && !(context.isOwner && permission.ownerAdminBypass !== false)) return { allowed: false, reason: 'admin' };
  if (permission.botAdminOnly && !context.isBotAdmin) return { allowed: false, reason: 'bot-admin' };
  if ((permission.restricted || context.publicMode === false) && !context.isOwner) return { allowed: false, reason: 'restricted' };
  return { allowed: true };
}

module.exports = { normalizeIdentity, validatePermission };
