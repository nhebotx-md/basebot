'use strict';

const { assertPublicHttpUrl } = require('../security/safe-url');

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
      const payload = {
        disclaimerText: boundedText(input?.disclaimerText || 'Code Block', 'Disclaimer', 120),
        headerText: boundedText(input?.title || 'Source Code', 'Judul', 160),
        contentText: input?.contentText === undefined ? '---' : boundedText(input.contentText, 'Konten', 500, true),
        code: boundedText(input?.code, 'Kode', 12000),
        language,
        footerText: input?.footerText ? boundedText(input.footerText, 'Footer', 160) : undefined
      };
      return send(jid, payload, options);
    },

    async sendTable(jid, input, options) {
      const rows = input?.rows;
      if (!Array.isArray(rows) || rows.length < 2 || rows.length > 20) throw new TypeError('Tabel harus berisi 2 sampai 20 baris.');
      const width = Array.isArray(rows[0]) ? rows[0].length : 0;
      if (width < 2 || width > 8 || rows.some(row => !Array.isArray(row) || row.length !== width || row.some(cell => typeof cell !== 'string' || cell.length > 160))) {
        throw new TypeError('Struktur tabel tidak konsisten; maksimal 8 kolom dan 160 karakter per sel.');
      }
      const payload = {
        disclaimerText: boundedText(input?.disclaimerText || 'Table', 'Disclaimer', 120),
        headerText: boundedText(input?.headerText || input?.title || 'Data', 'Header', 160),
        contentText: input?.contentText === undefined ? '---' : boundedText(input.contentText, 'Konten', 500, true),
        title: boundedText(input?.title || 'Ringkasan', 'Judul tabel', 160),
        table: rows,
        noHeading: input?.noHeading === true,
        footerText: input?.footerText ? boundedText(input.footerText, 'Footer', 160) : undefined
      };
      return send(jid, payload, options);
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
      for (const item of items) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) throw new TypeError('Submessage rich response tidak valid.');
        const keys = Object.keys(item);
        if (!keys.length || keys.some(key => !['text', 'language', 'code', 'title', 'table'].includes(key))) throw new TypeError('Tipe submessage rich response tidak didukung.');
        if (item.text !== undefined) boundedText(item.text, 'Teks rich response', 2000);
        if (item.language !== undefined && !LANGUAGES.has(String(item.language).toLowerCase())) throw new TypeError('Bahasa rich response tidak didukung.');
      }
      return send(jid, {
        disclaimerText: boundedText(input?.disclaimerText || 'Rich Response', 'Disclaimer', 120),
        richResponse: items
      }, options);
    },

    async sendCarousel(jid, input, options) {
      const cards = input?.cards;
      if (!Array.isArray(cards) || cards.length < 2 || cards.length > 10) throw new TypeError('Carousel harus berisi 2 sampai 10 kartu.');
      const normalized = [];
      for (const card of cards) {
        if (!card || typeof card !== 'object' || Array.isArray(card)) throw new TypeError('Kartu carousel tidak valid.');
        const image = card.image;
        if (typeof image === 'string') {
          await assertPublicHttpUrl(image);
          normalized.push({ image: { url: image }, caption: boundedText(card.caption || card.title || ' ', 'Caption kartu', 500, true), footer: card.footer ? boundedText(card.footer, 'Footer kartu', 160) : undefined, nativeFlow: Array.isArray(card.nativeFlow) ? card.nativeFlow : undefined });
        } else if (Buffer.isBuffer(image)) {
          normalized.push({ image, caption: boundedText(card.caption || card.title || ' ', 'Caption kartu', 500, true), footer: card.footer ? boundedText(card.footer, 'Footer kartu', 160) : undefined, nativeFlow: Array.isArray(card.nativeFlow) ? card.nativeFlow : undefined });
        } else throw new TypeError('Setiap kartu wajib memiliki gambar berupa URL publik atau Buffer.');
      }
      return send(jid, {
        text: boundedText(input?.text || 'Pilihan', 'Teks carousel', 1000),
        footer: input?.footer ? boundedText(input.footer, 'Footer', 160) : undefined,
        cards: normalized
      }, options);
    },

    async sendNativeFlow(jid, input, options) {
      const buttons = input?.buttons;
      if (!Array.isArray(buttons) || buttons.length < 1 || buttons.length > 10) throw new TypeError('Native flow harus berisi 1 sampai 10 tombol.');
      const nativeFlow = [];
      for (const button of buttons) {
        if (!button || typeof button !== 'object' || Array.isArray(button)) throw new TypeError('Tombol native flow tidak valid.');
        const text = boundedText(button.text, 'Teks tombol', 80);
        if (button.url) {
          await assertPublicHttpUrl(button.url);
          nativeFlow.push({ text, url: boundedText(button.url, 'URL tombol', 2048), useWebview: button.useWebview === true });
        } else if (button.call) nativeFlow.push({ text, call: boundedText(button.call, 'Nomor tombol', 32) });
        else if (button.copy !== undefined) nativeFlow.push({ text, copy: boundedText(button.copy, 'Teks salin', 256) });
        else nativeFlow.push({ text, id: boundedText(button.id, 'ID tombol', 128), ...(button.icon ? { icon: boundedText(button.icon, 'Ikon tombol', 40) } : {}) });
      }
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

module.exports = { createRichMessageService, LANGUAGES, boundedText };
