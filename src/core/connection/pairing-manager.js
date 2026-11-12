'use strict';

function normalizePhone(value) { return String(value || '').replace(/\D/g, ''); }

function createPairingManager({ config, logger = console, output = process.stdout }) {
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
        if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
        if (client.authState?.creds?.registered) return;
        const code = await client.requestPairingCode(phone, config.pairing.code || undefined);
        output.write(`Pairing code WhatsApp: ${code}\n`);
      } catch (error) {
        client._pairingRequested = false;
        logger.error('Permintaan pairing code gagal.', { error: error.message });
      }
    }
  };
}

module.exports = { createPairingManager, normalizePhone };
