'use strict';
module.exports = {
  name: 'upsw', commands: ['upsw'], category: 'owner',
  description: 'Menerbitkan teks atau media terpilih sebagai WhatsApp Status.', usage: '.upsw <teks> (opsional: balas media)',
  permissions: { ownerOnly: true },
  async execute(ctx) {
    const quoted = ctx.quoted;
    if (!quoted) {
      if (!ctx.text) return ctx.reply(`Gunakan ${ctx.prefix}upsw <teks> atau balas media.`);
      return ctx.client.sendStatusMention({ text: ctx.text }, [ctx.chat]);
    }
    if (quoted.mtype === 'conversation' || quoted.mtype === 'extendedTextMessage') return ctx.client.sendStatusMention({ text: quoted.text || ctx.text }, [ctx.chat]);
    const media = await quoted.download();
    if (!Buffer.isBuffer(media) || media.length > 20 * 1024 * 1024) return ctx.reply('Ukuran media maksimal 20 MB.');
    if (quoted.mtype === 'audioMessage') return ctx.client.sendStatusMention({ audio: media, mimetype: quoted.msg.mimetype || 'audio/ogg', ptt: true }, [ctx.chat]);
    if (quoted.mtype === 'imageMessage') return ctx.client.sendStatusMention({ image: media, caption: ctx.text }, [ctx.chat]);
    if (quoted.mtype === 'videoMessage') return ctx.client.sendStatusMention({ video: media, caption: ctx.text }, [ctx.chat]);
    return ctx.reply('Format status yang didukung: teks, gambar, video, atau audio.');
  }
};
