'use strict';

const { assertPublicHttpUrl, fetchPublic } = require('../security/safe-url');

const LANGUAGES = new Set(['css', 'html', 'javascript', 'typescript', 'python', 'golang', 'rust', 'c', 'c#', 'c++', 'bash', 'bat', 'powershell']);

function boundedText(value, name, max = 4000, allowEmpty = false) {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim()) || value.length > max) throw new TypeError(name + ' tidak valid atau terlalu panjang.');
  return value;
}

function normalizeLink(link) {
  if (!link || typeof link !== 'object' || Array.isArray(link)) throw new TypeError('Data link tidak valid.');
  return {
    text: boundedText(link.text, 'Teks link', 120),
    title: boundedText(link.title || link.text, 'Judul link', 160),
    url: boundedText(link.url, 'URL link', 2048)
  };
}

function normalizeRichItem(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) throw new TypeError('Submessage rich response tidak valid.');
  const keys = Object.keys(item);
  if (keys.length === 1 && keys[0] === 'text') return { text: boundedText(item.text, 'Teks rich response', 2000) };
  if (keys.includes('language') && keys.includes('code') && keys.every(key => ['language', 'code'].includes(key))) {
    const language = String(item.language).toLowerCase();
    if (!LANGUAGES.has(language)) throw new TypeError('Bahasa rich response tidak didukung.');
    if (typeof item.code === 'string') return { language, code: boundedText(item.code, 'Kode rich response', 12000) };
    if (!Array.isArray(item.code) || item.code.length < 1 || item.code.length > 500) throw new TypeError('Token code rich response tidak valid.');
    const code = item.code.map(token => {
      if (!token || typeof token !== 'object' || !Number.isInteger(token.highlightType)) throw new TypeError('Token code rich response tidak valid.');
      return { highlightType: token.highlightType, codeContent: boundedText(token.codeContent, 'Konten token code', 1000, true) };
    });
    return { language, code };
  }
  if (keys.includes('title') && keys.includes('table') && keys.every(key => ['title', 'table'].includes(key))) {
    if (!Array.isArray(item.table) || item.table.length < 2 || item.table.length > 20) throw new TypeError('Tabel rich response harus berisi 2 sampai 20 baris.');
    const table = item.table.map(row => {
      if (!row || typeof row !== 'object' || !Array.isArray(row.items) || row.items.length < 2 || row.items.length > 8 || typeof row.isHeading !== 'boolean') throw new TypeError('Baris tabel rich response tidak valid.');
      return { isHeading: row.isHeading, items: row.items.map(cell => boundedText(cell, 'Sel tabel', 160, true)) };
    });
    return { title: boundedText(item.title, 'Judul tabel', 160), table };
  }
  throw new TypeError('Submessage rich response harus berupa text, code, atau table.');
}

async function normalizeNativeFlow(buttons) {
  if (!Array.isArray(buttons) || buttons.length < 1 || buttons.length > 10) throw new TypeError('Native flow harus berisi 1 sampai 10 tombol.');
  const normalized = [];
  for (const button of buttons) {
    if (!button || typeof button !== 'object' || Array.isArray(button)) throw new TypeError('Tombol native flow tidak valid.');
    const text = boundedText(button.text, 'Teks tombol', 80);
    if (button.url) {
      const url = boundedText(button.url, 'URL tombol', 2048);
      await assertPublicHttpUrl(url);
      normalized.push({ text, url, useWebview: button.useWebview === true });
    } else if (button.call) {
      const call = boundedText(button.call, 'Nomor tombol', 32);
      if (!/^\+?\d{6,20}$/.test(call)) throw new TypeError('Nomor tombol tidak valid.');
      normalized.push({ text, call });
    } else if (button.copy !== undefined) {
      normalized.push({ text, copy: boundedText(button.copy, 'Teks salin', 256) });
    } else {
      normalized.push({ text, id: boundedText(button.id, 'ID tombol', 128), ...(button.icon ? { icon: boundedText(button.icon, 'Ikon tombol', 40) } : {}) });
    }
  }
  return normalized;
}

function createRichMessageService(sendMessage) {
  if (typeof sendMessage !== 'function') throw new TypeError('RichMessageService membutuhkan fungsi sendMessage.');

  async function send(jid, payload, options) {
    if (typeof jid !== 'string' || !jid.trim()) throw new TypeError('Tujuan pesan tidak valid.');
    return sendMessage(jid, payload, options || {});
  }

  return Object.freeze({
    sendCode(jid, input, options) {
      const language = String(input?.language || 'javascript').toLowerCase();
      if (!LANGUAGES.has(language)) throw new TypeError('Bahasa code block tidak didukung.');
      return send(jid, {
        disclaimerText: boundedText(input?.disclaimerText || 'Code Block', 'Disclaimer', 120),
        headerText: boundedText(input?.title || 'Source Code', 'Judul', 160),
        contentText: input?.contentText === undefined ? '---' : boundedText(input.contentText, 'Konten', 500, true),
        code: boundedText(input?.code, 'Kode', 12000),
        language,
        footerText: input?.footerText ? boundedText(input.footerText, 'Footer', 160) : undefined
      }, options);
    },

    async sendTable(jid, input, options) {
      const rows = input?.rows;
      if (!Array.isArray(rows) || rows.length < 2 || rows.length > 20) throw new TypeError('Tabel harus berisi 2 sampai 20 baris.');
      const width = Array.isArray(rows[0]) ? rows[0].length : 0;
      if (width < 2 || width > 8 || rows.some(row => !Array.isArray(row) || row.length !== width || row.some(cell => typeof cell !== 'string' || cell.length > 160))) {
        throw new TypeError('Struktur tabel tidak konsisten; maksimal 8 kolom dan 160 karakter per sel.');
      }
      return send(jid, {
        disclaimerText: boundedText(input?.disclaimerText || 'Table', 'Disclaimer', 120),
        headerText: boundedText(input?.headerText || input?.title || 'Data', 'Header', 160),
        contentText: input?.contentText === undefined ? '---' : boundedText(input.contentText, 'Konten', 500, true),
        title: boundedText(input?.title || 'Ringkasan', 'Judul tabel', 160),
        table: rows,
        noHeading: input?.noHeading === true,
        footerText: input?.footerText ? boundedText(input.footerText, 'Footer', 160) : undefined
      }, options);
    },

    async sendLinks(jid, input, options) {
      if (!Array.isArray(input?.links) || input.links.length < 1 || input.links.length > 10) throw new TypeError('Daftar link harus berisi 1 sampai 10 item.');
      const links = input.links.map(normalizeLink);
      for (const link of links) await assertPublicHttpUrl(link.url);
      return send(jid, {
        disclaimerText: boundedText(input?.disclaimerText || 'Links', 'Disclaimer', 120),
        headerText: boundedText(input?.headerText || input?.title || 'Tautan', 'Header', 160),
        contentText: input?.contentText === undefined ? '---' : boundedText(input.contentText, 'Konten', 500, true),
        links,
        footerText: input?.footerText ? boundedText(input.footerText, 'Footer', 160) : undefined
      }, options);
    },

    sendRichResponse(jid, input, options) {
      const items = input?.items;
      if (!Array.isArray(items) || items.length < 1 || items.length > 20) throw new TypeError('Rich response harus berisi 1 sampai 20 submessage.');
      const richResponse = items.map(normalizeRichItem);
      return send(jid, {
        disclaimerText: boundedText(input?.disclaimerText || 'Rich Response', 'Disclaimer', 120),
        richResponse
      }, options);
    },

    async sendCarousel(jid, input, options) {
      const cards = input?.cards;
      if (!Array.isArray(cards) || cards.length < 2 || cards.length > 10) throw new TypeError('Carousel harus berisi 2 sampai 10 kartu.');
      const normalized = [];
      let totalImageBytes = 0;
      for (const card of cards) {
        if (!card || typeof card !== 'object' || Array.isArray(card)) throw new TypeError('Kartu carousel tidak valid.');
        const image = card.image;
        let media;
        if (typeof image === 'string') {
          await assertPublicHttpUrl(image);
          const downloaded = await fetchPublic(image, { maxBytes: 10 * 1024 * 1024, timeoutMs: 15000 });
          if (!downloaded.ok || !downloaded.contentType.toLowerCase().startsWith('image/')) throw new TypeError('URL kartu tidak menghasilkan gambar yang valid.');
          media = downloaded.buffer;
        } else if (Buffer.isBuffer(image)) media = image;
        else throw new TypeError('Setiap kartu wajib memiliki gambar berupa URL publik atau Buffer.');
        totalImageBytes += media.length;
        if (totalImageBytes > 25 * 1024 * 1024) throw new RangeError('Total gambar carousel melebihi batas 25 MB.');
        const item = {
          image: media,
          caption: boundedText(card.caption || card.title || ' ', 'Caption kartu', 500, true)
        };
        if (card.footer) item.footer = boundedText(card.footer, 'Footer kartu', 160);
        if (card.nativeFlow !== undefined) item.nativeFlow = await normalizeNativeFlow(card.nativeFlow);
        normalized.push(item);
      }
      return send(jid, {
        text: boundedText(input?.text || 'Pilihan', 'Teks carousel', 1000),
        footer: input?.footer ? boundedText(input.footer, 'Footer', 160) : undefined,
        cards: normalized
      }, options);
    },

    async sendNativeFlow(jid, input, options) {
      const nativeFlow = await normalizeNativeFlow(input?.buttons);
      return send(jid, {
        text: boundedText(input?.text || 'Pilih tindakan', 'Teks pesan', 1000),
        footer: input?.footer ? boundedText(input.footer, 'Footer', 160) : undefined,
        optionText: input?.optionText ? boundedText(input.optionText, 'Teks opsi', 80) : undefined,
        optionTitle: input?.optionTitle ? boundedText(input.optionTitle, 'Judul opsi', 120) : undefined,
        nativeFlow
      }, options);
    }
  });
}

module.exports = { createRichMessageService, LANGUAGES, boundedText, normalizeRichItem, normalizeNativeFlow };
