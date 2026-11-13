'use strict';

function unwrapMessage(message) {
  let current = message || {};
  for (let i = 0; i < 5; i += 1) {
    if (current.ephemeralMessage?.message) current = current.ephemeralMessage.message;
    else if (current.viewOnceMessage?.message) current = current.viewOnceMessage.message;
    else if (current.viewOnceMessageV2?.message) current = current.viewOnceMessageV2.message;
    else if (current.documentWithCaptionMessage?.message) current = current.documentWithCaptionMessage.message;
    else break;
  }
  return current;
}

function getMessageText(message) {
  const content = unwrapMessage(message);
  if (typeof content.conversation === 'string') return content.conversation;
  for (const type of Object.keys(content)) {
    const item = content[type];
    if (!item || typeof item !== 'object') continue;
    for (const key of ['text', 'caption', 'selectedDisplayText', 'contentText', 'title']) if (typeof item[key] === 'string') return item[key];
    const row = item.singleSelectReply?.selectedRowId;
    if (typeof row === 'string') return row;
    if (typeof item.selectedButtonId === 'string') return item.selectedButtonId;
    if (typeof item.selectedId === 'string') return item.selectedId;
    const params = item.nativeFlowResponseMessage?.paramsJson;
    if (typeof params === 'string') {
      try { const parsed = JSON.parse(params); if (typeof parsed.id === 'string') return parsed.id; } catch { /* invalid interactive payload */ }
    }
  }
  return '';
}

function isPhoneJid(value) {
  return typeof value === 'string' && /@(s\.whatsapp\.net|c\.us)$/i.test(value);
}

function getSenderCandidates(raw, client) {
  const key = raw.key;
  if (key.fromMe) {
    return [client?.user?.id, key.participantAlt, key.participant, key.remoteJidAlt]
      .filter(value => typeof value === 'string' && value);
  }
  if ((key.remoteJid || '').endsWith('@g.us')) {
    return [key.participantAlt, key.participant]
      .filter(value => typeof value === 'string' && value);
  }
  return [key.remoteJidAlt, key.remoteJid]
    .filter(value => typeof value === 'string' && value);
}

function normalizeMessage(raw, client) {
  if (!raw || !raw.key || !raw.message) return null;
  const chat = raw.key.remoteJid || '';
  const decode = client?.decodeJid || (jid => jid);
  const senderCandidates = getSenderCandidates(raw, client);
  const preferredSender = senderCandidates.find(isPhoneJid) || senderCandidates[0] || '';
  let sender = preferredSender;
  try { sender = decode(preferredSender) || preferredSender; } catch { /* preserve original JID */ }
  const content = unwrapMessage(raw.message);
  const mtype = Object.keys(content)[0] || '';
  const msg = content[mtype] || {};
  const isGroup = chat.endsWith('@g.us');
  return {
    raw, key: raw.key, id: raw.key.id || '', chat, sender, senderCandidates, fromMe: Boolean(raw.key.fromMe),
    isGroup, isPrivate: !isGroup, pushName: raw.pushName || 'No Name',
    message: content, mtype, msg, body: getMessageText(content), text: getMessageText(content),
    quoted: msg.contextInfo?.quotedMessage || null,
    mentionedJid: msg.contextInfo?.mentionedJid || []
  };
}

module.exports = { normalizeMessage, unwrapMessage, getMessageText, isPhoneJid };
