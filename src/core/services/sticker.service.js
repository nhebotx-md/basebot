'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
const webp = require('node-webpmux');

ffmpeg.setFfmpegPath(ffmpegPath);

function metadataExif(metadata, categories = [''], extra = {}) {
  const json = {
    'sticker-pack-id': metadata.packId || crypto.randomBytes(16).toString('hex'),
    'sticker-pack-name': String(metadata.packname || ''),
    'sticker-pack-publisher': String(metadata.author || ''),
    emojis: Array.isArray(metadata.categories) ? metadata.categories : categories,
    ...extra
  };
  const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
  const exifHeader = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
  const exif = Buffer.concat([exifHeader, jsonBuffer]);
  exif.writeUIntLE(jsonBuffer.length, 14, 4);
  return exif;
}

async function convertToWebp(media, animated = false) {
  if (!Buffer.isBuffer(media) || media.length === 0) throw new TypeError('Data media kosong atau tidak valid.');
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'basebot-sticker-'));
  const inputFile = path.join(tempDirectory, animated ? 'input.mp4' : 'input.jpg');
  const outputFile = path.join(tempDirectory, 'output.webp');
  try {
    fs.writeFileSync(inputFile, media, { mode: 0o600, flag: 'wx' });
    await new Promise((resolve, reject) => {
      const command = ffmpeg(inputFile);
      const timer = setTimeout(() => command.kill('SIGKILL'), 45000);
      command
        .on('error', error => { clearTimeout(timer); reject(error); })
        .on('end', () => { clearTimeout(timer); resolve(); })
        .addOutputOptions([
          '-vcodec', 'libwebp',
          '-vf', "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse"
        ]);
      if (animated) command.addOutputOptions(['-loop', '0', '-ss', '00:00:00', '-t', '00:00:05', '-preset', 'default', '-an', '-vsync', '0']);
      command.toFormat('webp').save(outputFile);
    });
    fs.chmodSync(outputFile, 0o600);
    return fs.readFileSync(outputFile);
  } finally {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
}

async function imageToWebp(media) { return convertToWebp(media, false); }
async function videoToWebp(media) { return convertToWebp(media, true); }

async function embedExif(webpSticker, metadata = {}, extra = {}) {
  if (!Buffer.isBuffer(webpSticker) || webpSticker.length === 0) throw new TypeError('Data WebP sticker tidak valid.');
  const image = new webp.Image();
  await image.load(webpSticker);
  image.exif = metadataExif(metadata, [''], extra);
  const output = await image.save(null);
  if (!Buffer.isBuffer(output) || output.length === 0) throw new Error('Gagal menyimpan metadata sticker.');
  return output;
}

function writeStickerFile(buffer) {
  const file = path.join(os.tmpdir(), `${crypto.randomBytes(16).toString('hex')}.webp`);
  fs.writeFileSync(file, buffer, { mode: 0o600, flag: 'wx' });
  return file;
}

async function writeExifImg(media, metadata = {}) {
  if (!metadata.packname && !metadata.author) return undefined;
  return writeStickerFile(await embedExif(await imageToWebp(media), metadata));
}

async function writeExifVid(media, metadata = {}) {
  if (!metadata.packname && !metadata.author) return undefined;
  return writeStickerFile(await embedExif(await videoToWebp(media), metadata));
}

async function writeExif(media, metadata = {}) {
  const type = String(media?.mimetype || '').toLowerCase();
  let converted;
  if (type === 'image/webp') converted = media.data;
  else if (type.startsWith('image/')) converted = await imageToWebp(media.data);
  else if (type.startsWith('video/')) converted = await videoToWebp(media.data);
  else throw new TypeError('Format media untuk sticker tidak didukung.');
  if (!metadata.packname && !metadata.author) return converted;
  return writeStickerFile(await embedExif(converted, metadata));
}

async function exifAvatar(buffer, packname, author, categories = [''], extra = {}) {
  return embedExif(buffer, { packname, author, categories }, { 'is-avatar-sticker': 1, ...extra });
}

async function addExif(webpSticker, packname = '', author = '', categories = [''], extra = {}) {
  return embedExif(webpSticker, { packname, author, categories }, extra);
}

module.exports = { imageToWebp, videoToWebp, writeExifImg, writeExifVid, writeExif, exifAvatar, addExif };
