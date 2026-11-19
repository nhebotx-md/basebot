'use strict';

function makeError(message, code) { const error = new Error(message); error.code = code; return error; }

class ProviderManager {
  constructor({ timeoutMs = 30000, retries = 0, failureThreshold = 2, cooldownMs = 30000, clock = Date.now } = {}) {
    this.defaults = { timeoutMs: Math.max(100, Number(timeoutMs) || 30000), retries: Math.max(0, Math.min(3, Number(retries) || 0)), failureThreshold: Math.max(1, Number(failureThreshold) || 2), cooldownMs: Math.max(1000, Number(cooldownMs) || 30000) };
    this.clock = clock;
    this.providers = new Map();
  }
  _state(name) {
    const key = String(name || '').trim();
    if (!key) throw new TypeError('Nama provider wajib diisi.');
    if (!this.providers.has(key)) this.providers.set(key, { name: key, successes: 0, failures: 0, consecutiveFailures: 0, attempts: 0, lastSuccessAt: null, lastFailureAt: null, lastError: null, openUntil: 0, totalDurationMs: 0 });
    return this.providers.get(key);
  }
  async run(name, task, options = {}) {
    if (typeof task !== 'function') throw new TypeError('Task provider harus berupa function.');
    const state = this._state(name);
    const timeoutMs = Math.max(100, Number(options.timeoutMs) || this.defaults.timeoutMs);
    const retries = Math.max(0, Math.min(3, Number(options.retries ?? this.defaults.retries) || 0));
    const threshold = Math.max(1, Number(options.failureThreshold) || this.defaults.failureThreshold);
    const cooldownMs = Math.max(1000, Number(options.cooldownMs) || this.defaults.cooldownMs);
    if (state.openUntil > this.clock()) throw makeError('Circuit provider ' + state.name + ' sedang cooldown.', 'PROVIDER_CIRCUIT_OPEN');
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const started = this.clock();
      let timer;
      state.attempts += 1;
      try {
        if (options.signal?.aborted) throw makeError('Operasi provider dibatalkan.', 'ABORT_ERR');
        const work = Promise.resolve().then(() => task({ signal: controller.signal, attempt: attempt + 1 }));
        const timeout = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(makeError('Provider ' + state.name + ' melewati timeout ' + timeoutMs + ' ms.', 'PROVIDER_TIMEOUT')); }, timeoutMs); });
        const result = await Promise.race([work, timeout]);
        if (options.signal?.aborted) throw makeError('Operasi provider dibatalkan.', 'ABORT_ERR');
        if (typeof options.validate === 'function' && !options.validate(result)) throw makeError('Respons provider ' + state.name + ' tidak valid.', 'PROVIDER_INVALID_RESPONSE');
        clearTimeout(timer);
        state.successes += 1; state.consecutiveFailures = 0; state.lastSuccessAt = new Date(this.clock()).toISOString();
        state.lastError = null; state.openUntil = 0; state.totalDurationMs += Math.max(0, this.clock() - started);
        return result;
      } catch (error) {
        clearTimeout(timer);
        lastError = error; state.failures += 1; state.consecutiveFailures += 1;
        state.lastFailureAt = new Date(this.clock()).toISOString(); state.lastError = String(error?.message || error).slice(0, 180);
        state.totalDurationMs += Math.max(0, this.clock() - started);
        if (state.consecutiveFailures >= threshold) state.openUntil = this.clock() + cooldownMs;
        if (options.signal?.aborted || error?.code === 'ABORT_ERR' || attempt >= retries) break;
      }
    }
    throw lastError || makeError('Provider ' + state.name + ' gagal.', 'PROVIDER_FAILED');
  }
  status() {
    const now = this.clock();
    return [...this.providers.values()].map(item => ({
      name: item.name, successes: item.successes, failures: item.failures, attempts: item.attempts,
      consecutiveFailures: item.consecutiveFailures, circuit: item.openUntil > now ? 'open' : 'closed',
      cooldownRemainingMs: Math.max(0, item.openUntil - now), lastSuccessAt: item.lastSuccessAt,
      lastFailureAt: item.lastFailureAt, lastError: item.lastError,
      averageDurationMs: item.attempts ? Math.round(item.totalDurationMs / item.attempts) : 0
    }));
  }
}
module.exports = { ProviderManager };
