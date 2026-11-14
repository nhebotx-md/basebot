'use strict';

function levelForExp(exp) {
  return Math.floor(Math.sqrt(Math.max(0, Number(exp) || 0) / 100)) + 1;
}

function ensureUser(users, id, name, now) {
  if (!users[id]) {
    users[id] = {
      id, name: String(name || 'Pengguna').slice(0, 80), exp: 0, level: 1, coins: 0,
      stats: { messages: 0, commands: 0, groups: 0 },
      createdAt: now, updatedAt: now, lastSeenAt: now, lastExpAt: 0
    };
  }
  const user = users[id];
  user.stats ||= { messages: 0, commands: 0, groups: 0 };
  for (const key of ['messages', 'commands', 'groups']) user.stats[key] = Number(user.stats[key]) || 0;
  user.exp = Math.max(0, Number(user.exp) || 0);
  user.coins = Math.max(0, Number(user.coins) || 0);
  user.level = levelForExp(user.exp);
  if (name) user.name = String(name).slice(0, 80);
  user.updatedAt = now;
  user.lastSeenAt = now;
  return user;
}

class UserService {
  constructor({ database, expPerMessage = 5, expCooldownMs = 60000, clock = Date.now } = {}) {
    if (!database) throw new TypeError('UserService membutuhkan DatabaseService.');
    this.database = database;
    this.expPerMessage = Math.max(0, Number(expPerMessage) || 0);
    this.expCooldownMs = Math.max(0, Number(expCooldownMs) || 0);
    this.clock = clock;
  }

  async recordMessage(id, { name, isGroup = false } = {}) {
    if (!id) return null;
    const now = this.clock();
    const result = await this.database.update('users', users => {
      const user = ensureUser(users, id, name, new Date(now).toISOString());
      user.stats.messages += 1;
      if (isGroup) user.stats.groups += 1;
      if (this.expPerMessage && now - (Number(user.lastExpAt) || 0) >= this.expCooldownMs) {
        user.exp += this.expPerMessage;
        user.lastExpAt = now;
        user.level = levelForExp(user.exp);
      }
      return users;
    });
    return result[id];
  }

  async recordCommand(id, name) {
    if (!id) return null;
    const now = new Date(this.clock()).toISOString();
    const result = await this.database.update('users', users => {
      const user = ensureUser(users, id, name, now);
      user.stats.commands += 1;
      return users;
    });
    return result[id];
  }

  async getProfile(id) {
    if (!id) return null;
    return this.database.read('users')[id] || null;
  }

  async addExp(id, amount, name) {
    return this._changeBalance(id, 'exp', amount, name);
  }

  async addCoins(id, amount, name) {
    return this._changeBalance(id, 'coins', amount, name);
  }

  async spendCoins(id, amount, name) {
    const value = Math.floor(Number(amount));
    if (!id || !Number.isSafeInteger(value) || value <= 0) return { success: false, reason: 'invalid-amount' };
    const now = new Date(this.clock()).toISOString();
    let result;
    await this.database.update('users', users => {
      const user = ensureUser(users, id, name, now);
      if (user.coins < value) { result = { success: false, reason: 'insufficient-funds', balance: user.coins }; return users; }
      user.coins -= value;
      result = { success: true, balance: user.coins, profile: user };
      return users;
    });
    return result;
  }

  async _changeBalance(id, field, amount, name) {
    const value = Math.floor(Number(amount));
    if (!id || !Number.isSafeInteger(value) || value <= 0) throw new TypeError('ID dan jumlah harus valid dan positif.');
    const now = new Date(this.clock()).toISOString();
    const result = await this.database.update('users', users => {
      const user = ensureUser(users, id, name, now);
      user[field] += value;
      if (field === 'exp') user.level = levelForExp(user.exp);
      return users;
    });
    return result[id];
  }
}

module.exports = { UserService, levelForExp };