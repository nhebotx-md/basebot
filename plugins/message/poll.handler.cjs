'use strict';

const MAX_STORED_POLLS = 200;
const MAX_UPDATES_PER_POLL = 500;
const POLL_MAP_PROPERTY = '__basebotPollVotes';

function getPollMap(client) {
  if (!(client[POLL_MAP_PROPERTY] instanceof Map)) client[POLL_MAP_PROPERTY] = new Map();
  return client[POLL_MAP_PROPERTY];
}

function pollKey(chat, id) {
  return `${chat || ''}:${id || ''}`;
}

function pollUpdateAuthor(update) {
  const key = update?.pollUpdateMessageKey;
  return key?.participantAlt || key?.remoteJidAlt || key?.participant || key?.remoteJid || key?.id || '';
}

function normalizeEventEntries(event) {
  if (Array.isArray(event)) return event;
  if (Array.isArray(event?.messages)) return event.messages;
  return event && typeof event === 'object' ? [event] : [];
}

module.exports = {
  name: 'poll',
  commands: ['poll', 'pollhasil'],
  category: 'message',
  description: 'Membuat polling dan menampilkan hasil suara anonim.',
  usage: '.poll [--multi] pertanyaan | opsi1 | opsi2 ...; .pollhasil (balas polling)',
  permissions: {},
  events: ['messages.update'],

  async execute(ctx) {
    if (ctx.command.toLowerCase() === 'pollhasil') {
      const quotedKey = ctx.quoted?.key;
      if (!quotedKey?.id || !quotedKey.remoteJid) {
        return ctx.reply('Balas pesan polling yang dibuat bot dengan perintah .pollhasil.');
      }
      const stored = getPollMap(ctx.client).get(pollKey(quotedKey.remoteJid, quotedKey.id));
      if (!stored?.message || !stored.updates) {
        return ctx.reply('Data polling tidak ditemukan atau sudah tidak tersimpan.');
      }

      const { getAggregateVotesInPollMessage } = await import('@itsliaaa/baileys');
      const results = getAggregateVotesInPollMessage(
        { message: stored.message.message, pollUpdates: [...stored.updates.values()] },
        ctx.client.user?.id
      );
      if (!Array.isArray(results) || results.length === 0) {
        return ctx.reply('Hasil polling belum tersedia.');
      }
      const lines = results
        .filter(option => option && typeof option.name === 'string' && option.name !== 'Unknown')
        .map(option => `• ${option.name}: ${Array.isArray(option.voters) ? option.voters.length : 0}`);
      if (!lines.length) return ctx.reply('Hasil polling belum tersedia.');
      return ctx.reply(`Hasil polling (anonim):\n${lines.join('\n')}`);
    }

    let input = String(ctx.text || '').trim();
    let multi = false;
    if (/^--multi(?:\s|$)/i.test(input)) {
      multi = true;
      input = input.replace(/^--multi\s*/i, '').trim();
    }
    const parts = input.split('|').map(part => part.trim());
    const question = parts.shift() || '';
    const options = parts;
    if (!question || options.length < 2 || options.length > 12 || options.some(option => !option)) {
      return ctx.reply(`Format tidak valid. Gunakan: ${ctx.prefix}poll [--multi] pertanyaan | opsi1 | opsi2 (2–12 opsi).`);
    }
    if (question.length > 300 || options.some(option => option.length > 100)) {
      return ctx.reply('Pertanyaan maksimal 300 karakter dan setiap opsi maksimal 100 karakter.');
    }

    const sent = await ctx.sendMessage(ctx.chat, {
      poll: {
        name: question,
        values: options,
        selectableCount: multi ? Math.min(options.length, 12) : 1
      }
    }, { quoted: ctx.m.raw });

    const messageId = sent?.key?.id;
    const chat = sent?.key?.remoteJid || ctx.chat;
    if (messageId && sent?.message) {
      const polls = getPollMap(ctx.client);
      const key = pollKey(chat, messageId);
      if (polls.has(key)) polls.delete(key);
      polls.set(key, { message: sent, updates: new Map() });
      while (polls.size > MAX_STORED_POLLS) polls.delete(polls.keys().next().value);
    }
  },

  async onEvent(ctx, event) {
    const polls = getPollMap(ctx.client);
    for (const entry of normalizeEventEntries(event)) {
      const key = entry?.key;
      const pollId = key?.id;
      const chat = key?.remoteJid;
      if (!pollId || !chat) continue;
      const stored = polls.get(pollKey(chat, pollId));
      if (!stored) continue;
      const updates = entry.update?.pollUpdates;
      if (!Array.isArray(updates)) continue;

      for (const update of updates) {
        if (!update || typeof update !== 'object') continue;
        const author = pollUpdateAuthor(update);
        if (!author) continue;
        if (stored.updates.has(author)) stored.updates.delete(author);
        stored.updates.set(author, update);
        while (stored.updates.size > MAX_UPDATES_PER_POLL) {
          stored.updates.delete(stored.updates.keys().next().value);
        }
      }
      // Keep recently active polls toward the end of the bounded cache.
      polls.delete(pollKey(chat, pollId));
      polls.set(pollKey(chat, pollId), stored);
    }
  }
};
