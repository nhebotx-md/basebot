'use strict';

const { createClientFactory } = require('../client/create-client');
const { createPairingManager } = require('./pairing-manager');
const { createConnectionUpdateHandler } = require('../events/connection-update');
const { createMessagesUpsertHandler } = require('../events/messages-upsert');
const { createContactsUpdateHandler } = require('../events/contacts-update');
const { createGroupParticipantsHandler } = require('../events/group-participants');

function errorContext(error) {
  if (!(error instanceof Error)) return { error: String(error) };
  return { errorName: error.name, errorCode: error.code, errorMessage: error.message, error };
}

function disconnectName(DisconnectReason, statusCode) {
  if (!DisconnectReason || statusCode === undefined || statusCode === null) return 'unknown';
  const entry = Object.entries(DisconnectReason).find(([key, value]) => Number.isNaN(Number(key)) && value === statusCode);
  return entry?.[0] || 'unknown';
}

function createConnectionManager({ config, registry, dispatcher, logger = console, createClient = createClientFactory({ config, logger }), timerApi = globalThis }) {
  let baileys = null;
  const getBaileys = async () => { baileys ||= await import('@itsliaaa/baileys'); return baileys; };
  const pairing = createPairingManager({ config, logger });
  let current = null;
  let connecting = null;
  let reconnectTimer = null;
  let reconnectAttempts = 0;
  let restartRequiredCount = 0;
  let runtimePublicMode = config.publicMode;
  let stopped = false;
  const closedClients = new WeakSet();

  function scheduleReconnect(statusCode, error, { immediate = false, reason = 'transient' } = {}) {
    if (stopped || reconnectTimer) return;
    if (!immediate && reconnectAttempts >= 8) {
      logger.error('Reconnect otomatis dihentikan setelah batas percobaan tercapai.', { attempts: reconnectAttempts, statusCode, reason, ...errorContext(error) });
      return;
    }
    if (!immediate) reconnectAttempts += 1;
    const delayMs = immediate ? 0 : Math.min(30000, 1000 * (2 ** Math.min(reconnectAttempts - 1, 5)));
    logger.info('Reconnect WhatsApp dijadwalkan.', { attempt: reconnectAttempts, delayMs, statusCode, reason, ...errorContext(error) });
    reconnectTimer = timerApi.setTimeout(() => {
      reconnectTimer = null;
      connect().catch(connectError => {
        current = null;
        logger.error('Pembuatan socket saat reconnect gagal.', errorContext(connectError));
        scheduleReconnect(undefined, connectError, { reason: 'socket-create-failed' });
      });
    }, delayMs);
    // Intentionally do not unref(): in CLI deployments this timer must keep the
    // process alive after Baileys has closed its WebSocket handles.
  }

  async function connect() {
    if (stopped || current) return current;
    if (connecting) return connecting;
    connecting = (async () => {
      logger.info('Membuat socket WhatsApp.', { attempt: reconnectAttempts + 1 });
      const client = await createClient();
      if (stopped) { client.end?.(new Error('Startup dihentikan.')); return null; }
      if (current) { client.end?.(new Error('Socket duplikat ditutup.')); return current; }
      current = client;
      const store = { contacts: Object.create(null) };
      client.public = runtimePublicMode;
      const onMessages = createMessagesUpsertHandler({ dispatcher, config, registry, logger });
      const onContacts = createContactsUpdateHandler({ logger });
      const onGroupParticipants = createGroupParticipantsHandler({ dispatcher, client, config, registry, logger });
      client.ev.on('messages.upsert', update => {
        Promise.resolve(onMessages(client, update, store)).catch(error => logger.error('Handler messages.upsert gagal.', errorContext(error)));
      });
      client.ev.on('contacts.update', update => {
        try { onContacts(update); } catch (error) { logger.error('Handler contacts.update gagal.', errorContext(error)); }
      });
      client.ev.on('group-participants.update', update => {
        Promise.resolve(onGroupParticipants(update)).catch(error => logger.error('Handler group-participants.update gagal.', errorContext(error)));
      });
      client.ev.on('connection.update', createConnectionUpdateHandler({
        logger,
        onUpdate: update => {
          Promise.resolve(onConnectionUpdate(client, update)).catch(error => logger.error('Pemrosesan status koneksi gagal.', errorContext(error)));
        }
      }));
      logger.info('Socket WhatsApp siap; listener event terpasang.', { reconnect: reconnectAttempts > 0 });
      return client;
    })();
    try { return await connecting; } finally { connecting = null; }
  }

  async function onConnectionUpdate(client, update) {
    if (client !== current || stopped) return;
    if (update.qr && !client.authState?.creds?.registered) {
      logger.debug('Baileys mengirim sinyal pairing; kode QR disembunyikan.', { qrAvailable: true, credentialsRegistered: false });
      void pairing.onSocketReady(client).catch(error => logger.error('Inisialisasi pairing gagal.', errorContext(error)));
    }
    if (update.isNewLogin) {
      logger.info('WhatsApp mengonfirmasi login perangkat baru.', { credentialsRegistered: Boolean(client.authState?.creds?.registered) });
    }
    if (update.connection === 'connecting') {
      logger.info('Handshake WhatsApp sedang berlangsung.');
      return;
    }
    if (update.connection === 'open') {
      reconnectAttempts = 0;
      restartRequiredCount = 0;
      if (reconnectTimer) timerApi.clearTimeout(reconnectTimer);
      reconnectTimer = null;
      logger.info('Koneksi WhatsApp aktif.', { credentialsRegistered: Boolean(client.authState?.creds?.registered), pendingNotifications: update.receivedPendingNotifications === true });
      return;
    }
    if (update.connection !== 'close' || closedClients.has(client)) return;
    closedClients.add(client);

    const disconnectError = update.lastDisconnect?.error;
    const statusCode = disconnectError?.output?.statusCode ?? disconnectError?.statusCode;
    const { DisconnectReason } = await getBaileys();
    const reason = disconnectName(DisconnectReason, statusCode);
    const loggedOut = statusCode === DisconnectReason.loggedOut;
    const restartRequired = statusCode === DisconnectReason.restartRequired;

    if (restartRequired) {
      restartRequiredCount += 1;
      logger.info('Baileys meminta socket baru (restartRequired/515); ini normal setelah pairing atau pembaruan sesi.', {
        statusCode,
        reason,
        credentialsRegistered: Boolean(client.authState?.creds?.registered),
        isNewLogin: Boolean(update.isNewLogin),
        occurrence: restartRequiredCount
      });
    } else {
      logger.warn('Socket WhatsApp ditutup.', { statusCode, reason, ...errorContext(disconnectError) });
    }

    let credentialsFlushed = true;
    try {
      await client.waitForCredentialPersistence?.();
      logger.debug('Antrean penyimpanan kredensial selesai sebelum reconnect.', { credentialsRegistered: Boolean(client.authState?.creds?.registered) });
    } catch (error) {
      credentialsFlushed = false;
      logger.error('Kredensial tidak berhasil disimpan sebelum reconnect; retry memakai backoff.', errorContext(error));
    }

    runtimePublicMode = client.public !== false;
    current = null;
    if (loggedOut) {
      logger.error('Sesi WhatsApp logout; reconnect otomatis dihentikan dan diperlukan pairing baru.', { statusCode, reason });
      return;
    }

    const immediateRestart = restartRequired && restartRequiredCount === 1 && credentialsFlushed;
    scheduleReconnect(statusCode, disconnectError, {
      immediate: immediateRestart,
      reason: restartRequired ? 'restart-required' : 'connection-closed'
    });
  }

  async function start() { return connect(); }
  async function stop() {
    if (stopped) return;
    stopped = true;
    if (reconnectTimer) timerApi.clearTimeout(reconnectTimer);
    reconnectTimer = null;
    const socket = current;
    current = null;
    if (!socket) return;
    try {
      await socket.waitForCredentialPersistence?.();
    } catch (error) {
      logger.error('Gagal menyelesaikan penyimpanan auth saat shutdown.', errorContext(error));
    }
    try { socket.end?.(new Error('Graceful shutdown')); }
    catch (error) { logger.warn('Socket shutdown mengembalikan error.', errorContext(error)); }
    logger.info('Socket WhatsApp dihentikan.');
  }
  return { start, stop, get client() { return current; }, get reconnectAttempts() { return reconnectAttempts; } };
}

module.exports = { createConnectionManager, disconnectName };
