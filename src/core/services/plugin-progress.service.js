'use strict';

const { createFakeQuoted } = require('../messaging/fake-quoted');

const MAX_STEPS = 6;
const MAX_LABEL = 110;

function clean(value, fallback = '') {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, MAX_LABEL);
}

function createNoopPluginProgress() {
  const noop = async () => false;
  noop.start = noop;
  noop.update = noop;
  noop.step = noop;
  noop.complete = noop;
  noop.fail = noop;
  noop.isStarted = () => false;
  noop.isFinished = () => false;
  noop.snapshot = () => ({ started: false, finished: false, status: 'idle', steps: [], current: null });
  return noop;
}

function getPluginProgress(ctx) {
  return typeof ctx?.progress === 'function' ? ctx.progress : createNoopPluginProgress();
}

function createPluginProgress({ client, message, plugin, command, commandLabel = '', logger = console, botName = 'ShooNhee-AI' } = {}) {
  if (!client || typeof client.sendMessage !== 'function' || !message?.chat || !message?.key) return createNoopPluginProgress();
  const state = { started: false, finished: false, status: 'running', statusMessage: null, steps: [], current: null, startedAt: 0, deliveryUnavailable: false };

  function render() {
    const elapsed = state.startedAt ? Math.max(0, Math.round((Date.now() - state.startedAt) / 1000)) : 0;
    const lines = [
      ...(commandLabel ? ['> ' + clean(commandLabel), ''] : []),
      '╭─〔 BASEBOT PROCESS 〕',
      '│ Plugin  : *' + clean(plugin?.name, 'unknown') + '*',
      '│ Command : *' + clean(command, '-') + '*',
      '│ Status  : *' + (state.status === 'success' ? 'BERHASIL' : state.status === 'failed' ? 'GAGAL' : 'SEDANG DIPROSES') + '*',
      '├──────────────────'
    ];
    for (const step of state.steps.slice(-MAX_STEPS)) {
      lines.push('│ ' + (step.done ? '✓' : '○') + ' ' + step.label);
      if (step.detail) lines.push('│   ' + step.detail);
    }
    if (state.current) {
      const marker = state.status === 'success' ? '✓' : state.status === 'failed' ? '⚠' : '⏳';
      lines.push('│ ' + marker + ' ' + state.current.label);
      if (state.current.detail) lines.push('│   ' + state.current.detail);
    }
    if (state.status === 'running') lines.push('│', '│ Mohon tunggu, proses masih berlangsung.');
    else if (state.status === 'success') lines.push('│', '│ Selesai dalam ' + elapsed + ' detik.');
    else lines.push('│', '│ Proses dihentikan. Periksa keterangan kegagalan.');
    lines.push('╰──────────────────');
    return lines.join('\n');
  }

  async function publish(reaction) {
    if (state.deliveryUnavailable) return false;
    try {
      const content = { text: render() };
      if (state.statusMessage?.key) {
        await client.sendMessage(message.chat, { ...content, edit: state.statusMessage.key });
      } else {
        state.statusMessage = await client.sendMessage(message.chat, content, { quoted: createFakeQuoted(botName, true, message.chat) });
      }
      if (reaction) {
        try { await client.sendMessage(message.chat, { react: { text: reaction, key: message.key } }); }
        catch (error) { logger.debug?.('Reaksi progres tidak dapat dikirim.', { plugin: plugin?.name, error: error.message }); }
      }
      return true;
    } catch (error) {
      state.deliveryUnavailable = true;
      logger.warn?.('Pesan progres plugin tidak dapat dikirim atau diperbarui; proses plugin tetap dilanjutkan.', { plugin: plugin?.name, command, error: error.message });
      return false;
    }
  }

  async function start(label = 'Menyiapkan proses plugin', options = {}) {
    if (state.finished) return false;
    if (state.started) return update(label, options);
    state.started = true;
    state.startedAt = Date.now();
    state.current = { label: clean(label, 'Menyiapkan proses plugin'), detail: clean(options.detail) };
    await publish('⏳');
    return true;
  }

  async function update(label, options = {}) {
    if (state.finished) return false;
    if (!state.started) return start(label, options);
    if (state.current) state.steps.push({ ...state.current, done: true });
    if (state.steps.length > MAX_STEPS) state.steps.shift();
    state.current = { label: clean(label, 'Memproses'), detail: clean(options.detail) };
    await publish();
    return true;
  }

  async function complete(label = 'Proses berhasil diselesaikan') {
    if (state.finished) return false;
    if (!state.started) return false;
    if (state.current) state.steps.push({ ...state.current, done: true });
    if (state.steps.length > MAX_STEPS) state.steps.shift();
    state.current = { label: clean(label, 'Proses berhasil diselesaikan'), detail: '' };
    state.status = 'success';
    state.finished = true;
    await publish('✅');
    return true;
  }

  async function fail(label = 'Proses gagal diselesaikan', options = {}) {
    if (state.finished) return false;
    if (!state.started) return false;
    state.current = { label: clean(label, 'Proses gagal diselesaikan'), detail: clean(options.detail) };
    state.status = 'failed';
    state.finished = true;
    await publish('❌');
    return true;
  }

  const process = (label, options) => update(label, options);
  process.start = start;
  process.update = update;
  process.step = update;
  process.complete = complete;
  process.fail = fail;
  process.isStarted = () => state.started;
  process.isFinished = () => state.finished;
  process.snapshot = () => ({ started: state.started, finished: state.finished, status: state.status, steps: state.steps.map(step => ({ ...step })), current: state.current ? { ...state.current } : null });
  return process;
}

module.exports = { createPluginProgress, createNoopPluginProgress, getPluginProgress, cleanProgressLabel: clean };
