'use strict';
function createContactsUpdateHandler({ logger = console } = {}) {
  return contacts => {
    if (!Array.isArray(contacts)) return;
    logger.debug('Kontak diperbarui.', { count: contacts.length });
  };
}
module.exports = { createContactsUpdateHandler };
