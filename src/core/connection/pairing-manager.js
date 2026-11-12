'use strict';

function normalizePhone(value) { return String(value || '').replace(/\D/g, ''); }

function createPairingManager({ config, logger = console, output = process.stdout, delay = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  let customCodeWarningLogged = false;
  return {
    async onSocketReady(client) {
      if (client.authState?.creds?.registered) return;
      if (!config.pairing.phone) {
        if (!client._pairingMissingLogged) logger.warn('Sesi belum terdaftar; atur PAIRING_PHONE untuk meminta pairing code.');
        client._pairingMissingLogged = true;
        return;
      }
      const phone = normalizePhone(config.pairing.phone);
      if (!/^\d{6,15}$/.test(phone)) throw new Error('PAIRING_PHONE tidak valid.');
      if (client._pairingRequested) return;
      client._pairingRequested = true;
      try {
        const delayMs = Number.isFinite(config.pairing.delayMs) ? config.pairing.delayMs : 1500;
        if (delayMs > 0) await delay(delayMs);
        if (client.authState?.creds?.registered) return;
        if (client.ws && client.ws.isOpen === false) throw new Error('WebSocket sudah tertutup sebelum pairing code diminta.');
        if (config.pairing.code && !customCodeWarningLogged) {
          customCodeWarningLogged = true;
          logger.warn('PAIRING_CODE kustom diabaikan; gunakan kode Crockford yang dihasilkan Baileys agar kompatibel dengan WhatsApp.');
        }
        // Do not pass a fixed custom code. The library generates a protocol-compatible code.
        const code = await client.requestPairingCode(phone);
        logger.info('Pairing code berhasil diminta; tunggu persetujuan di ponsel.', { codeLength: String(code).length });
        output.write(`Pairing code WhatsApp: ${code}\n`);
      } catch (error) {
        client._pairingRequested = false;
        logger.error('Permintaan pairing code gagal.', { error });
      }
    }
  };
}

module.exports = { createPairingManager, normalizePhone };
