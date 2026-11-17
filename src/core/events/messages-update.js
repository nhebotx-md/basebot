'use strict';

function createMessagesUpdateHandler({ dispatcher, client, config, registry, logger }) {
  if (!dispatcher || typeof dispatcher.dispatchEvent !== 'function') throw new TypeError('MessagesUpdateHandler membutuhkan CommandDispatcher.');
  return async update => {
    const context = {
      client,
      sock: client,
      config,
      registry,
      logger,
      services: { config, logger }
    };
    await dispatcher.dispatchEvent('messages.update', context, update);
  };
}

module.exports = { createMessagesUpdateHandler };
