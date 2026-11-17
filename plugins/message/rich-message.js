'use strict';

const METHODS = Object.freeze({
  code: 'sendCode',
  table: 'sendTable',
  links: 'sendLinks',
  response: 'sendRichResponse',
  carousel: 'sendCarousel',
  flow: 'sendNativeFlow'
});

module.exports = {
  name: 'rich-message',
  commands: ['richmsg'],
  category: 'message',
  description: 'Mengirim code block, tabel, inline link, rich response, carousel, dan native-flow melalui satu builder.',
  usage: '.richmsg <code|table|links|response|carousel|flow> <JSON>',
  permissions: {},
  async execute(ctx) {
    const input = String(ctx.text || '').trim();
    const match = input.match(/^(\w+)\s+([\s\S]+)$/);
    if (!match || !METHODS[match[1].toLowerCase()]) return ctx.reply('Format: .richmsg <code|table|links|response|carousel|flow> <JSON>. Contoh: .richmsg code {"language":"javascript","code":"console.log(1)"}');
    let payload;
    try { payload = JSON.parse(match[2]); }
    catch { return ctx.reply('Payload harus berupa JSON valid. Gunakan tanda kutip ganda untuk nama field dan teks.'); }
    const method = METHODS[match[1].toLowerCase()];
    const builder = ctx.services?.richMessage;
    if (!builder || typeof builder[method] !== 'function') return ctx.reply('Rich message builder tidak tersedia pada runtime ini.');
    await builder[method](ctx.chat, payload);
  }
};
