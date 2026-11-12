'use strict';
function createConnectionUpdateHandler({ logger = console, onUpdate = () => {} } = {}) {
  return update => {
    const details = {
      connection: update.connection,
      qrAvailable: Boolean(update.qr),
      isNewLogin: Boolean(update.isNewLogin),
      pendingNotifications: update.receivedPendingNotifications
    };
    if (update.connection) logger.info('Status koneksi WhatsApp berubah.', details);
    else if (update.qr || update.isNewLogin || update.receivedPendingNotifications !== undefined) logger.debug('Sinyal lifecycle Baileys diterima.', details);
    onUpdate(update);
  };
}
module.exports = { createConnectionUpdateHandler };
