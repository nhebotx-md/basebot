'use strict';
const axios = require('axios');
module.exports = {
  name: 'jeslyn', commands: ['jeslyn'], category: 'ai',
  description: 'Berbincang dengan asisten AI.', usage: '.jeslyn <pesan>', permissions: {},
  async execute(ctx) {
    if (!ctx.text) return ctx.reply(`Contoh: ${ctx.prefix}jeslyn hai, perkenalkan dirimu.`);
    const prompt = 'Namamu Jeslyn, asisten yang ramah dan santai. Jawab dalam Bahasa Indonesia dengan ringkas dan sesuai pertanyaan.';
    const response = await axios.get('https://www.laurine.site/api/cai/prompt-ai', { params: { query: ctx.text, prompt }, timeout: 15000 });
    const answer = response.data?.data;
    if (response.data?.status !== true || typeof answer !== 'string' || !answer.trim()) throw new Error('Layanan AI tidak memberikan jawaban valid.');
    const wantsVoice = /\b(vn|voice note|pesan suara)\b/i.test(ctx.text);
    if (wantsVoice && ctx.config.tts.apiKey && ctx.config.tts.voiceId) {
      const audio = await axios.get('https://www.laurine.site/api/tts/elevenlabs', {
        params: { text: answer.slice(0, 1500), apiKey: ctx.config.tts.apiKey, voiceId: ctx.config.tts.voiceId },
        timeout: 30000, responseType: 'arraybuffer'
      });
      if (audio.data.byteLength > 15 * 1024 * 1024) throw new Error('Audio melebihi batas ukuran.');
      return ctx.sendMessage(ctx.chat, { audio: Buffer.from(audio.data), mimetype: 'audio/mpeg', ptt: true }, { quoted: ctx.m.raw });
    }
    await ctx.reply(answer.slice(0, 4000));
  }
};
