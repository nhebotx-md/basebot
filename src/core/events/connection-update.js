'use strict';
function createConnectionUpdateHandler({ logger = console, onUpdate = () => {} } = {}) {
  return update => {
    const details = {
      connection: update.connection,
      qrAvailable: Boolean(update.qr),
      isNewLogin: Boolean(update.isNewLogin),
      pendingNotifications: update.receivedPendingNotifications
    };
    if (!update.connection && (update.qr || update.isNewLogin || update.receivedPendingNotifications !== undefined)) logger.debug('Sinyal lifecycle Baileys diterima; payload sensitif disembunyikan.', details);
    onUpdate(update);
  };
}
module.exports = { createConnectionUpdateHandler };
