'use strict';
function createConnectionUpdateHandler({ logger = console, onUpdate = () => {} } = {}) {
  return update => {
    if (update.connection) logger.info('Status koneksi WhatsApp berubah.', { connection: update.connection });
    onUpdate(update);
  };
}
module.exports = { createConnectionUpdateHandler };
