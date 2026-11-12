'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

const FILTERS = {
  bass: ['-af', 'equalizer=f=54:width_type=o:width=2:g=12'],
  blown: ['-af', 'acrusher=.1:1:64:0:log'],
  deep: ['-af', 'asetrate=29400,atempo=1.5'],
  earrape: ['-af', 'volume=8'],
  fast: ['-af', 'atempo=1.5'],
  fat: ['-af', 'asetrate=29400,atempo=1.5'],
  nightcore: ['-af', 'asetrate=55125,atempo=0.8'],
  reverse: ['-af', 'areverse'],
  robot: ['-af', "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)':win_size=512:overlap=0.75"],
  slow: ['-af', 'atempo=0.7'],
  smooth: ['-af', 'lowpass=f=7000'],
  tupai: ['-af', 'asetrate=65100,atempo=0.68']
};

function resolveFfmpegPath() {
  try {
    const executable = require('@ffmpeg-installer/ffmpeg').path;
    if (!executable || !path.isAbsolute(executable) || !fs.existsSync(executable)) throw new Error('Executable FFmpeg tidak ditemukan.');
    return executable;
  } catch (cause) {
    const error = new Error('Binari FFmpeg tidak tersedia. Jalankan `npm ci` pada direktori BASEBOT lalu mulai ulang bot.', { cause });
    error.code = 'FFMPEG_BINARY_MISSING';
    throw error;
  }
}

function runFfmpeg(input, output, filterArgs) {
  let executable;
  try { executable = resolveFfmpegPath(); }
  catch (error) { return Promise.reject(error); }
  return new Promise((resolve, reject) => {
    const child = spawn(executable, ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-i', input, ...filterArgs, '-vn', output], { stdio: 'ignore' });
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Pemrosesan audio melewati batas waktu.')); }, 30000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`FFmpeg keluar dengan status ${code}.`)); });
  });
}

module.exports = {
  name: 'voicechanger', commands: Object.keys(FILTERS), category: 'media',
  description: 'Mengubah karakteristik audio menggunakan FFmpeg.', usage: '.bass (balas audio)', permissions: {},
  async execute(ctx) {
    if (!ctx.mime.startsWith('audio/')) return ctx.reply(`Balas audio dengan ${ctx.prefix}${ctx.command}.`);
    const buffer = await ctx.quoted.download();
    if (!Buffer.isBuffer(buffer) || buffer.length > 20 * 1024 * 1024) return ctx.reply('Ukuran audio maksimal 20 MB.');
    const folder = path.resolve(ctx.config.paths.temp);
    await fs.promises.mkdir(folder, { recursive: true, mode: 0o700 });
    const nonce = crypto.randomBytes(12).toString('hex');
    const input = path.join(folder, `${nonce}.input`);
    const output = path.join(folder, `${nonce}.mp3`);
    try {
      await fs.promises.writeFile(input, buffer, { mode: 0o600, flag: 'wx' });
      await runFfmpeg(input, output, FILTERS[ctx.command]);
      const result = await fs.promises.readFile(output);
      if (result.length > 20 * 1024 * 1024) throw new Error('Audio hasil melebihi batas ukuran.');
      await ctx.sendMessage(ctx.chat, { audio: result, mimetype: 'audio/mpeg', ptt: true }, { quoted: ctx.m.raw });
    } catch (error) {
      if (error.code === 'FFMPEG_BINARY_MISSING') return ctx.reply(error.message);
      throw error;
    } finally {
      await Promise.all([fs.promises.unlink(input).catch(() => {}), fs.promises.unlink(output).catch(() => {})]);
    }
  }
};
