'use strict';
const { fetchPublic } = require('../../src/core/security/safe-url');
module.exports = {
  name: 'get', commands: ['get'], category: 'owner',
  description: 'Mengambil respons dari URL publik yang tervalidasi.', usage: '.get <URL>',
  permissions: { ownerOnly: true },
  async execute(ctx) {
    let response;
    try { response = await fetchPublic(ctx.text, { timeoutMs: 12000, maxBytes: 8 * 1024 * 1024, headers: { 'user-agent': 'BASEBOT/1.0' } }); }
    catch (error) { return ctx.reply(error.message); }
    if (response.status >= 300 && response.status < 400) return ctx.reply('Redirect tidak diizinkan untuk alasan keamanan.');
    if (!response.ok) return ctx.reply(`Server mengembalikan HTTP ${response.status}.`);
    const mime = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
    const limit = /^(image|audio|video)\//.test(mime) ? 8 * 1024 * 1024 : 256 * 1024;
    const body = response.buffer;
    if (body.length > limit) return ctx.reply('Respons melebihi batas ukuran untuk tipe konten tersebut.');
    if (mime.startsWith('image/')) return ctx.sendMessage(ctx.chat, { image: body }, { quoted: ctx.m.raw });
    if (mime.startsWith('video/')) return ctx.sendMessage(ctx.chat, { video: body }, { quoted: ctx.m.raw });
    if (mime.startsWith('audio/')) return ctx.sendMessage(ctx.chat, { audio: body, mimetype: mime }, { quoted: ctx.m.raw });
    let output = body.toString('utf8');
    try { output = JSON.stringify(JSON.parse(output), null, 2); } catch { /* respons teks biasa */ }
    await ctx.reply(output.slice(0, 6000));
  }
};
