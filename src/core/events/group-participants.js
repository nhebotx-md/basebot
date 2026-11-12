'use strict';

function createGroupParticipantsHandler({ dispatcher, client, config, registry, logger }) {
  return async event => {
    const context = { client, sock: client, config, registry, logger, services: { config, logger }, chat: event.id, isGroup: true, isPrivate: false };
    await dispatcher.dispatchEvent('group-participants.update', context, event);
  };
}

module.exports = { createGroupParticipantsHandler };
