'use strict';

function parseCommand(body, configuredPrefix = '.') {
  if (typeof body !== 'string') return null;
  const text = body.trim();
  if (!text) return null;
  const prefixes = (Array.isArray(configuredPrefix) ? configuredPrefix : [configuredPrefix]).filter(value => typeof value === 'string' && value.length).sort((a, b) => b.length - a.length);
  const prefix = prefixes.find(candidate => text.startsWith(candidate));
  if (!prefix) return null;
  const content = text.slice(prefix.length).trim();
  if (!content) return null;
  const parts = content.split(/\s+/);
  const command = parts.shift().toLocaleLowerCase('id-ID');
  return { prefix, command, args: parts, text: parts.join(' '), body: text };
}

module.exports = { parseCommand };
