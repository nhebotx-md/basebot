'use strict';

const MAX_MEDIA_BYTES = 20 * 1024 * 1024;
const MODES = Object.freeze({
  spoiler: { flag: 'spoiler', label: 'spoiler' },
  viewonce: { flag: 'viewOnce', label: 'sekali lihat' },
  ephemeral: { flag: 'ephemeral', label: 'pesan sementara' }
});

module.exports = {
  name: 'message-wrappers',
  commands: ['spoiler', 'viewonce', 'ephemeral'],
  category: 'message',
  description: 'Mengirim ulang gambar atau video dengan wrapper spoiler, view-once, atau ephemeral.',
  usage: '.spoiler|.viewonce|.ephemeral (balas gambar/video) [caption]',
  permissions: {},
  async execute(ctx) {
    const command = String(ctx.command || '').toLowerCase();
    const mode = MODES[command];
    if (!mode) return ctx.reply('Mode pesan tidak dikenal.');
    if (!ctx.quoted) return ctx.reply('Balas gambar atau video dengan ' + ctx.prefix + command + '.');

    const mediaType = ctx.quoted.mtype;
    const field = mediaType === 'imageMessage' ? 'image' : mediaType === 'videoMessage' ? 'video' : '';
    if (!field) return ctx.reply('Fitur ini hanya menerima gambar atau video.');

    const mimetype = String(ctx.quoted.msg?.mimetype || ctx.mime || (field === 'image' ? 'image/jpeg' : 'video/mp4'));
    if (field === 'image' && !mimetype.startsWith('image/')) return ctx.reply('Jenis gambar tidak valid.');
    if (field === 'video' && !mimetype.startsWith('video/')) return ctx.reply('Jenis video tidak valid.');

    const buffer = await ctx.quoted.download();
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) return ctx.reply('Media sumber kosong atau tidak dapat dibaca.');
    if (buffer.length > MAX_MEDIA_BYTES) return ctx.reply('Ukuran media maksimal 20 MB.');

    const content = { [field]: buffer, [mode.flag]: true };
    if (field === 'video') content.mimetype = mimetype;
    const caption = String(ctx.text || '').trim().slice(0, 1024);
    if (caption) content.caption = caption;
    await ctx.sendMessage(ctx.chat, content, { quoted: ctx.m.raw });
  }
};
