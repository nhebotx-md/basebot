'use strict';
module.exports = {
  name: 'react-channel', commands: ['reactch'], category: 'owner',
  description: 'Memberi reaksi emoji pada pesan WhatsApp Channel.', usage: '.reactch <tautan pesan channel> <emoji>', permissions: { ownerOnly: true },
  async execute(ctx) {
    const match = ctx.text.match(/^https:\/\/whatsapp\.com\/channel\/([\w-]+)\/(\d+)(?:\s+(.+))?$/i);
    if (!match) return ctx.reply(`Contoh: ${ctx.prefix}reactch https://whatsapp.com/channel/ID/123 ❤️`);
    const [, channel, messageId, emoji = '😀'] = match;
    const metadata = await ctx.client.newsletterMetadata('invite', channel);
    if (!metadata?.id) return ctx.reply('Channel tidak ditemukan.');
    await ctx.client.newsletterReactMessage(metadata.id, messageId, emoji);
    await ctx.reply('Reaksi berhasil dikirim.');
  }
};
