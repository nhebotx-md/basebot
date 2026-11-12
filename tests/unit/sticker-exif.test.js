'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const { imageToWebp, videoToWebp, addExif, writeExifImg, writeExifVid } = require('../../start/lib/exif');

const PNG_FIXTURE = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAmklEQVR4nO3QQRHAIADAMEAD/g9heBky8lijoNe5z/3Gjy0doDVAB2gN0AFaA3SA1gAdoDVAB2gN0AFaA3SA1gAdoDVAB2gN0AFaA3SA1gAdoDVAB2gN0AFaA3SA1gAdoDVAB2gN0AFaA3SA1gAdoDVAB2gN0AFaA3SA1gAdoDVAB2gN0AFaA3SA1gAdoDVAB2gN0AFaA3SA9gC2qAMPikGtXAAAAABJRU5ErkJggg==', 'base64');
const GIF_FIXTURE = Buffer.from('R0lGODlhQABAAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQAFAAAACwAAAAAQABAAAAIaQABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFixgzatzIsaPHjyBDihxJsqTJkyhTqlzJsqXLlzBjypxJs6bNmzhz6tzJs6fPn0CDCh1KtKjRo0iTKl3KtKnTp1CjSp1KtarVq1izagUQEAAh+QQBFAABACwAAAAAQABAAIEAAP8AAAAAAAAAAAAIaQABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFixgzatzIsaPHjyBDihxJsqTJkyhTqlzJsqXLlzBjypxJs6bNmzhz6tzJs6fPn0CDCh1KtKjRo0iTKl3KtKnTp1CjSp1KtarVq1izagUQEAA7', 'base64');

function tempStickerDirectories() {
  return new Set(fs.readdirSync(os.tmpdir()).filter(name => name.startsWith('basebot-sticker-')));
}

test('sticker converter produces valid WebP and EXIF metadata, and always removes private input temp directories', async () => {
  const before = tempStickerDirectories();
  const webp = await imageToWebp(PNG_FIXTURE);
  assert.equal(webp.toString('ascii', 0, 4), 'RIFF');
  assert.equal(webp.toString('ascii', 8, 12), 'WEBP');
  const tagged = await addExif(webp, 'BASEBOT', 'Test');
  assert.equal(tagged.toString('ascii', 0, 4), 'RIFF');
  assert.equal(tagged.toString('ascii', 8, 12), 'WEBP');
  assert.ok(tagged.includes(Buffer.from('sticker-pack-name')));
  assert.deepEqual(tempStickerDirectories(), before);
});

test('metadata sticker file has private permissions and is caller-cleanable', async () => {
  const stickerPath = await writeExifImg(PNG_FIXTURE, { packname: 'BASEBOT', author: 'Test' });
  try {
    const stat = fs.statSync(stickerPath);
    assert.equal(stat.mode & 0o777, 0o600);
    const buffer = fs.readFileSync(stickerPath);
    assert.equal(buffer.toString('ascii', 8, 12), 'WEBP');
  } finally { fs.rmSync(stickerPath, { force: true }); }
});

test('animated GIF converts to animated WebP and EXIF sticker without leaving temporary folders', async () => {
  const before = tempStickerDirectories();
  const webp = await videoToWebp(GIF_FIXTURE);
  assert.equal(webp.toString('ascii', 8, 12), 'WEBP');
  assert.ok(webp.includes(Buffer.from('ANIM')) || webp.includes(Buffer.from('ANMF')));
  const stickerPath = await writeExifVid(GIF_FIXTURE, { packname: 'BASEBOT', author: 'Test' });
  try { assert.equal(fs.readFileSync(stickerPath).toString('ascii', 8, 12), 'WEBP'); }
  finally { fs.rmSync(stickerPath, { force: true }); }
  assert.deepEqual(tempStickerDirectories(), before);
});

test('sticker converter rejects empty media before allocating temp files', async () => {
  const before = tempStickerDirectories();
  await assert.rejects(() => imageToWebp(Buffer.alloc(0)), /kosong|tidak valid/i);
  assert.deepEqual(tempStickerDirectories(), before);
});

test('failed FFmpeg conversion removes its private temporary directory', async () => {
  const before = tempStickerDirectories();
  await assert.rejects(() => imageToWebp(Buffer.from('not-an-image')));
  assert.deepEqual(tempStickerDirectories(), before);
});
