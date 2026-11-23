'use strict';

function amount(value) {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError('Nominal harus berupa bilangan bulat positif.');
    return value;
  }
  const normalized = String(value ?? '').trim().replace(/[.\s]/g, '').replace(/,/g, '');
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new TypeError('Nominal harus berupa bilangan bulat positif.');
  return parsed;
}
function clean(value, max = 80) {
  const result = String(value || '').replace(/[\r\n\t]/g, ' ').trim().slice(0, max);
  if (!result) throw new TypeError('Keterangan tidak boleh kosong.');
  return result;
}
function ensureFinance(users, jid) {
  const user = users[jid];
  if (!user) throw new Error('Profil pengguna belum tersedia. Daftar atau kirim pesan terlebih dahulu.');
  user.finance ||= { transactions: [], budgets: {}, debts: [], goals: [], recurring: [] };
  for (const key of ['transactions', 'debts', 'goals', 'recurring']) if (!Array.isArray(user.finance[key])) user.finance[key] = [];
  if (!user.finance.budgets || typeof user.finance.budgets !== 'object' || Array.isArray(user.finance.budgets)) user.finance.budgets = {};
  return user.finance;
}
function monthKey(date = new Date()) { return date.toISOString().slice(0, 7); }

class FinanceService {
  constructor({ database, clock = () => new Date() } = {}) {
    if (!database) throw new TypeError('FinanceService membutuhkan DatabaseService.');
    this.database = database;
    this.clock = clock;
  }
  async _mutate(jid, fn) {
    if (!jid || typeof jid !== 'string') throw new TypeError('Identitas WhatsApp tidak valid.');
    let result;
    await this.database.update('users', users => { result = fn(ensureFinance(users, jid)); return users; });
    return result;
  }
  get(jid) {
    if (!jid) throw new TypeError('Identitas WhatsApp tidak valid.');
    const user = this.database.read('users')[jid];
    if (!user) throw new Error('Profil pengguna belum tersedia.');
    const finance = user.finance || {};
    return { transactions: Array.isArray(finance.transactions) ? finance.transactions : [], budgets: finance.budgets || {}, debts: Array.isArray(finance.debts) ? finance.debts : [], goals: Array.isArray(finance.goals) ? finance.goals : [], recurring: Array.isArray(finance.recurring) ? finance.recurring : [] };
  }
  async addTransaction(jid, { type, value, category, note, date, account = 'Tunai' }) {
    if (!['income', 'expense', 'transfer'].includes(type)) throw new TypeError('Jenis transaksi tidak valid.');
    const item = { id: 'trx_' + this.clock().getTime().toString(36) + '_' + Math.random().toString(36).slice(2, 8), type, amount: amount(value), category: clean(category || 'Lainnya', 40), note: clean(note || category || type, 120), account: clean(account, 40), date: date ? clean(date, 10) : this.clock().toISOString().slice(0, 10), createdAt: this.clock().toISOString() };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date) || Number.isNaN(Date.parse(item.date))) throw new TypeError('Tanggal harus YYYY-MM-DD.');
    await this._mutate(jid, finance => { finance.transactions.push(item); });
    return item;
  }
  async deleteTransaction(jid, id) {
    let removed;
    await this._mutate(jid, finance => { const index = finance.transactions.findIndex(item => item.id === id || item.id.endsWith(String(id))); if (index < 0) throw new Error('Transaksi tidak ditemukan.'); [removed] = finance.transactions.splice(index, 1); });
    return removed;
  }
  async setBudget(jid, category, value) {
    const key = clean(category, 40).toLocaleLowerCase('id-ID');
    await this._mutate(jid, finance => { finance.budgets[key] = { category: clean(category, 40), limit: amount(value), updatedAt: this.clock().toISOString() }; });
    return this.get(jid).budgets[key];
  }
  async addDebt(jid, { name, value, note = '' }) {
    const debt = { id: 'debt_' + this.clock().getTime().toString(36), name: clean(name), principal: amount(value), paid: 0, note: String(note).slice(0, 120), createdAt: this.clock().toISOString(), status: 'active' };
    await this._mutate(jid, finance => { finance.debts.push(debt); }); return debt;
  }
  async payDebt(jid, id, value) {
    const payment = amount(value); let debt;
    await this._mutate(jid, finance => { debt = finance.debts.find(item => item.id === id || item.id.endsWith(String(id))); if (!debt || debt.status !== 'active') throw new Error('Utang aktif tidak ditemukan.'); if (payment > debt.principal - debt.paid) throw new Error('Pembayaran melebihi sisa utang.'); debt.paid += payment; if (debt.paid === debt.principal) debt.status = 'paid'; debt.updatedAt = this.clock().toISOString(); });
    return debt;
  }
  async addGoal(jid, { name, target, dueDate = '' }) {
    const goal = { id: 'goal_' + this.clock().getTime().toString(36), name: clean(name), target: amount(target), saved: 0, dueDate: dueDate ? clean(dueDate, 10) : null, createdAt: this.clock().toISOString(), status: 'active' };
    await this._mutate(jid, finance => { finance.goals.push(goal); }); return goal;
  }
  async contributeGoal(jid, id, value) {
    const contribution = amount(value); let goal;
    await this._mutate(jid, finance => { goal = finance.goals.find(item => item.id === id || item.id.endsWith(String(id))); if (!goal || goal.status !== 'active') throw new Error('Target tabungan aktif tidak ditemukan.'); goal.saved = Math.min(goal.target, goal.saved + contribution); if (goal.saved >= goal.target) goal.status = 'completed'; goal.updatedAt = this.clock().toISOString(); });
    return goal;
  }
  async addRecurring(jid, { type, value, category, note, interval = 'monthly', nextDate = '' }) {
    if (!['income', 'expense'].includes(type)) throw new TypeError('Transaksi rutin hanya mendukung income/expense.');
    if (!['daily', 'weekly', 'monthly', 'yearly'].includes(interval)) throw new TypeError('Interval harus daily, weekly, monthly, atau yearly.');
    const item = { id: 'rec_' + this.clock().getTime().toString(36), type, amount: amount(value), category: clean(category || 'Lainnya', 40), note: clean(note || category || type, 120), interval, nextDate: nextDate || this.clock().toISOString().slice(0, 10), active: true, createdAt: this.clock().toISOString() };
    await this._mutate(jid, finance => { finance.recurring.push(item); }); return item;
  }
  async runRecurring(jid, id) {
    let item;
    await this._mutate(jid, finance => {
      item = finance.recurring.find(entry => entry.id === id || entry.id.endsWith(String(id)));
      if (!item || !item.active) throw new Error('Transaksi rutin aktif tidak ditemukan.');
      const today = this.clock().toISOString().slice(0, 10);
      if (item.nextDate > today) throw new Error('Jadwal berikutnya belum jatuh tempo: ' + item.nextDate);
      finance.transactions.push({ id: 'trx_' + this.clock().getTime().toString(36) + '_rec', type: item.type, amount: item.amount, category: item.category, note: item.note + ' (rutin)', account: 'Tunai', date: today, createdAt: this.clock().toISOString() });
      const date = new Date(item.nextDate + 'T12:00:00Z');
      if (item.interval === 'daily') date.setUTCDate(date.getUTCDate() + 1);
      if (item.interval === 'weekly') date.setUTCDate(date.getUTCDate() + 7);
      if (item.interval === 'monthly') date.setUTCMonth(date.getUTCMonth() + 1);
      if (item.interval === 'yearly') date.setUTCFullYear(date.getUTCFullYear() + 1);
      item.nextDate = date.toISOString().slice(0, 10); item.lastRunAt = this.clock().toISOString();
    });
    return item;
  }
  summary(jid, month = monthKey(this.clock())) {
    const data = this.get(jid); const transactions = data.transactions.filter(item => item.date.startsWith(month));
    const income = transactions.filter(item => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
    const expense = transactions.filter(item => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
    const spent = {};
    for (const item of transactions.filter(entry => entry.type === 'expense')) { const key = item.category.toLocaleLowerCase('id-ID'); spent[key] = (spent[key] || 0) + item.amount; }
    const budgets = Object.values(data.budgets).map(item => ({ ...item, spent: spent[item.category.toLocaleLowerCase('id-ID')] || 0, remaining: item.limit - (spent[item.category.toLocaleLowerCase('id-ID')] || 0) }));
    const activeDebt = data.debts.filter(item => item.status === 'active').reduce((sum, item) => sum + item.principal - item.paid, 0);
    return { month, income, expense, net: income - expense, balance: data.transactions.filter(item => item.type !== 'transfer').reduce((sum, item) => sum + (item.type === 'income' ? item.amount : -item.amount), 0), budgets, spent, activeDebt, goals: data.goals.filter(item => item.status === 'active'), transactions };
  }
  exportCsv(jid) {
    const rows = [['id', 'tanggal', 'jenis', 'nominal', 'kategori', 'keterangan', 'akun']];
    for (const item of this.get(jid).transactions) rows.push([item.id, item.date, item.type, item.amount, item.category, item.note, item.account]);
    return rows.map(row => row.map(value => '"' + String(value ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
  }
}
module.exports = { FinanceService, amount, monthKey };
