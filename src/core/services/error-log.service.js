'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const REFERENCE_PATTERN = /^[0-9A-F]{8}$/;
const DEFAULT_FILENAME = 'muse-md.jsonl';
const DEFAULT_MAX_FILES = 5;

function normalizeReference(input) {
  const reference = String(input || '').trim().toUpperCase();
  if (!REFERENCE_PATTERN.test(reference)) throw new Error('ID referensi harus 8 karakter heksadesimal, contoh: 6E397A04.');
  return reference;
}

function candidateFiles(directory, filename, maxFiles) {
  const files = [path.join(directory, filename)];
  for (let index = 1; index < maxFiles; index += 1) {
    files.push(path.join(directory, filename + '.' + index));
  }
  return files;
}

function findInText(text, reference) {
  const lines = String(text || '').split('\n');
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index].trim();
    if (!line || !line.includes(reference)) continue;
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    if (entry?.data?.kind === 'plugin-error' && entry?.data?.reference === reference) return entry;
  }
  return null;
}

async function findErrorByReference({ directory = './logs', filename = DEFAULT_FILENAME, reference, maxFiles = DEFAULT_MAX_FILES } = {}) {
  const normalized = normalizeReference(reference);
  const limit = Math.max(1, Math.min(20, Math.floor(Number(maxFiles) || DEFAULT_MAX_FILES)));
  for (const file of candidateFiles(path.resolve(directory), filename, limit)) {
    let text;
    try { text = await fs.readFile(file, 'utf8'); }
    catch (error) { if (error?.code === 'ENOENT') continue; throw error; }
    const found = findInText(text, normalized);
    if (found) return found;
  }
  return null;
}

module.exports = { findErrorByReference, normalizeReference, REFERENCE_PATTERN, DEFAULT_FILENAME, DEFAULT_MAX_FILES };
