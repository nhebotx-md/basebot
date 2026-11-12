'use strict';

const { createClientFactory } = require('../client/create-client');
const { createPairingManager } = require('./pairing-manager');
const { createConnectionUpdateHandler } = require('../events/connection-update');
const { createMessagesUpsertHandler } = require('../events/messages-upsert');
const { createContactsUpdateHandler } = require('../events/contacts-update');
const { createGroupParticipantsHandler } = require('../events/group-participants');

function createConnectionManager({ config, registry, dispatcher, logger, createClient = createClientFactory({ config, logger }) }) {
  let baileys = null;
  const getBaileys = async () => { baileys ||= await import('@itsliaaa/baileys'); return baileys; };
  const pairing = createPairingManager({ config, logger });
  let current = null;
  let connecting = null;
  let reconnectTimer = null;
  let reconnectAttempts = 0;
  let runtimePublicMode = config.publicMode;
  let stopped = false;

  function scheduleReconnect(statusCode, error) {
    if (stopped || reconnectTimer) return;
    if (reconnectAttempts >= 8) {
      logger.error('Reconnect otomatis dihentikan setelah batas percobaan tercapai.', { attempts: reconnectAttempts, error: error?.message });
      return;
    }
    reconnectAttempts += 1;
    const delayMs = Math.min(30000, 1000 * (2 ** Math.min(reconnectAttempts - 1, 5)));
    logger.warn('Koneksi terputus; reconnect dijadwalkan.', { attempt: reconnectAttempts, delayMs, statusCode, error: error?.message });
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect().catch(connectError => {
        current = null;
        logger.error('Reconnect gagal.', { error: connectError });
        scheduleReconnect(undefined, connectError);
      });
    }, delayMs);
    reconnectTimer.unref?.();
  }

  async function connect() {
    if (stopped || current) return current;
    if (connecting) return connecting;
    connecting = (async () => {
      const client = await createClient();
      if (stopped) { client.end?.(new Error('Startup dihentikan.')); return null; }
      if (current) { client.end?.(new Error('Socket duplikat ditutup.')); return current; }
      current = client;
      const store = { contacts: Object.create(null) };
      client.public = runtimePublicMode;
      const onMessages = createMessagesUpsertHandler({ dispatcher, config, registry, logger });
      client.ev.on('messages.upsert', update => { void onMessages(client, update, store); });
      client.ev.on('contacts.update', createContactsUpdateHandler({ logger }));
      client.ev.on('group-participants.update', createGroupParticipantsHandler({ dispatcher, client, config, registry, logger }));
      client.ev.on('connection.update', createConnectionUpdateHandler({ logger, onUpdate: update => { void onConnectionUpdate(client, update).catch(error => logger.error('Pemrosesan status koneksi gagal.', { error })); } }));
      return client;
    })();
    try { return await connecting; } finally { connecting = null; }
  }

  async function onConnectionUpdate(client, update) {
    if (client !== current) return;
    if (update.qr && !client.authState?.creds?.registered) void pairing.onSocketReady(client);
    if (update.connection === 'open') {
      reconnectAttempts = 0;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = null;
      logger.info('Koneksi WhatsApp aktif.');
      return;
    }
    if (update.connection !== 'close') return;
    const code = update.lastDisconnect?.error?.output?.statusCode;
    const { DisconnectReason } = await getBaileys();
    const loggedOut = code === DisconnectReason.loggedOut;
    runtimePublicMode = client.public !== false;
    current = null;
    if (loggedOut) {
      logger.warn('Sesi WhatsApp logout; reconnect otomatis dihentikan.');
      return;
    }
    scheduleReconnect(code, update.lastDisconnect?.error);
  }

  async function start() { return connect(); }
  async function stop() {
    stopped = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    const socket = current;
    current = null;
    try { socket?.end?.(new Error('Graceful shutdown')); }
    catch (error) { logger.warn('Socket shutdown mengembalikan error.', { error: error.message }); }
  }
  return { start, stop, get client() { return current; } };
}

module.exports = { createConnectionManager };
