'use strict';

class GroupService {
  constructor({ database, clock = Date.now } = {}) {
    if (!database) throw new TypeError('GroupService membutuhkan DatabaseService.');
    this.database = database;
    this.clock = clock;
  }

  async recordMessage(id, { subject } = {}) {
    if (!id) return null;
    const now = new Date(this.clock()).toISOString();
    const result = await this.database.update('groups', groups => {
      const group = groups[id] || {
        id, subject: '', settings: { welcome: true, antiLink: false },
        stats: { messages: 0, membersJoined: 0, membersLeft: 0 },
        createdAt: now, updatedAt: now
      };
      if (subject) group.subject = String(subject).slice(0, 100);
      group.stats ||= { messages: 0, membersJoined: 0, membersLeft: 0 };
      group.stats.messages = (Number(group.stats.messages) || 0) + 1;
      group.updatedAt = now;
      groups[id] = group;
      return groups;
    });
    return result[id];
  }

  async getGroup(id) {
    if (!id) return null;
    return this.database.read('groups')[id] || null;
  }

  async updateSettings(id, patch) {
    if (!id || !patch || typeof patch !== 'object' || Array.isArray(patch)) throw new TypeError('ID grup dan perubahan pengaturan wajib valid.');
    const now = new Date(this.clock()).toISOString();
    const result = await this.database.update('groups', groups => {
      const group = groups[id] || {
        id, subject: '', settings: { welcome: true, antiLink: false },
        stats: { messages: 0, membersJoined: 0, membersLeft: 0 },
        createdAt: now, updatedAt: now
      };
      group.settings = { ...group.settings, ...patch };
      group.updatedAt = now;
      groups[id] = group;
      return groups;
    });
    return result[id];
  }
}

module.exports = { GroupService };