'use strict';
module.exports = {
  name: 'bocchi', commands: ['bocci', 'bocchi'], category: 'ai',
  description: 'Berbincang dengan asisten Bocchi.', usage: '.bocchi <pesan>', permissions: {},
  async execute(ctx) {
    if (!ctx.text) return ctx.reply(`Contoh: ${ctx.prefix}${ctx.command} hai`);
    if (ctx.text.length > 2000) return ctx.reply('Pesan maksimal 2.000 karakter.');
    const endpoint = `https://www.laurine.site/api/cai/bocchi?query=${encodeURIComponent(ctx.text)}`;
    const result = await ctx.services.fetchJson(endpoint);
    if (typeof result?.data !== 'string' || !result.data.trim()) throw new Error('Layanan AI tidak memberikan jawaban valid.');
    await ctx.sendMessage(ctx.chat, { text: result.data.slice(0, 4000), contextInfo: { mentionedJid: [ctx.sender], isForwarded: true, externalAdReply: { title: 'Bocchi AI', body: 'Artificial intelligence', mediaType: 1, thumbnailUrl: 'https://img12.pixhost.to/images/816/574630313_fc9f2773.jpg', sourceUrl: 'https://www.laurine.site' } } }, { quoted: ctx.m.raw });
  }
};
