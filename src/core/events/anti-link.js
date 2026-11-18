'use strict';

const LINK_PATTERN = /(?:https?:\/\/|www\.|chat\.whatsapp\.com\/|wa\.me\/|t\.me\/|bit\.ly\/|tinyurl\.com\/|\b[a-z0-9-]+\.(?:com|net|org|id|co|io|me|gg|xyz|app|dev)(?:\/|\b))/i;

function containsExternalLink(value) {
  return typeof value === 'string' && LINK_PATTERN.test(value);
}

module.exports = { LINK_PATTERN, containsExternalLink };
