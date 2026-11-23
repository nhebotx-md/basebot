'use strict';

const MAX_MESSAGE_LENGTH = 3500;

function splitMessage(value, limit = MAX_MESSAGE_LENGTH) {
  const chunks = [];
  let current = '';
  for (const line of String(value || '').split('\n')) {
    if (line.length > limit) {
      if (current) chunks.push(current);
      current = '';
      for (let offset = 0; offset < line.length; offset += limit) {
        chunks.push(line.slice(offset, offset + limit));
      }
      continue;
    }
    if (current && current.length + line.length + 1 > limit) {
      chunks.push(current);
      current = line;
    } else {
      current += (current ? '\n' : '') + line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

module.exports = {
  name: 'basebot-allmenu',
  commands: ['allmenu'],
  category: 'main',
  description: 'Menampilkan seluruh command aktif yang dapat diakses pengguna.',
  usage: '.allmenu',
  permissions: {},
  async execute(ctx) {
    const service = ctx.registry?.menuService;
    if (!service || typeof service.renderAllMenu !== 'function') {
      await ctx.reply('Direktori fitur lengkap belum tersedia. Periksa menu service BASEBOT.');
      return;
    }
    const pages = splitMessage(service.renderAllMenu(ctx));
    for (const page of pages) {
      await ctx.reply(page);
    }
  }
};
