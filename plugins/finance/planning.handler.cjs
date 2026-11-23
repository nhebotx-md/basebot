'use strict';
const { amount } = require('../../src/core/services/finance.service');
function money(value) { return 'Rp' + Number(value || 0).toLocaleString('id-ID'); }
module.exports = {
  name: 'finance-planning',
  commands: ['finance', 'balance', 'setbudget', 'budget', 'budgetcheck', 'debt', 'paydebt', 'debtreport', 'saving', 'goal', 'paygoal', 'recurring', 'runrecurring', 'monthly', 'yearly', 'analytics', 'cashflow', 'exportfinance'],
  category: 'finance',
  description: 'Dashboard, anggaran, utang, target tabungan, transaksi rutin, laporan, dan ekspor.',
  usage: '.finance | .setbudget makanan 100000 | .debt pinjaman 500000 | .saving dana-darurat 1000000',
  permissions: {},
  async execute(ctx) {
    const service = ctx.services?.finance;
    if (!service || !ctx.sender) return ctx.reply('Layanan keuangan belum siap.');
    const [a, b, ...tail] = ctx.args || [];
    const command = String(ctx.command || '').toLowerCase();
    try {
      if (command === 'setbudget') {
        if (!a || !b) return ctx.reply('Format: .setbudget kategori nominal');
        const item = await service.setBudget(ctx.sender, a, amount(b));
        return ctx.reply('Anggaran ' + item.category + ' ditetapkan: ' + money(item.limit));
      }
      if (command === 'debt') {
        if (!a || !b) return ctx.reply('Format: .debt nama nominal');
        const item = await service.addDebt(ctx.sender, { name: a, value: amount(b), note: tail.join(' ') });
        return ctx.reply('Utang dicatat: ' + item.name + '\nNominal: ' + money(item.principal) + '\nID: ' + item.id);
      }
      if (command === 'paydebt') {
        if (!a || !b) return ctx.reply('Format: .paydebt ID nominal');
        const item = await service.payDebt(ctx.sender, a, amount(b));
        return ctx.reply('Pembayaran tercatat. Sisa utang ' + item.name + ': ' + money(item.principal - item.paid));
      }
      if (['saving', 'goal'].includes(command)) {
        if (!a || !b) return ctx.reply('Format: .saving nama-target nominal-target');
        const item = await service.addGoal(ctx.sender, { name: a, target: amount(b), dueDate: tail[0] || '' });
        return ctx.reply('Target tabungan dibuat: ' + item.name + '\nTarget: ' + money(item.target) + '\nID: ' + item.id);
      }
      if (command === 'paygoal') {
        if (!a || !b) return ctx.reply('Format: .paygoal ID nominal');
        const item = await service.contributeGoal(ctx.sender, a, amount(b));
        return ctx.reply('Tabungan ' + item.name + ': ' + money(item.saved) + ' / ' + money(item.target) + ' (' + item.status + ')');
      }
      if (command === 'recurring') {
        if (tail.length < 1) return ctx.reply('Format: .recurring income|expense nominal kategori [daily|weekly|monthly|yearly]');
        const interval = ['daily','weekly','monthly','yearly'].includes(tail.at(-1)) ? tail.at(-1) : 'monthly';
        const category = tail[0];
        const item = await service.addRecurring(ctx.sender, { type: a, value: amount(b), category, note: tail.slice(1, -1).join(' ') || category, interval });
        return ctx.reply('Transaksi rutin dibuat: ' + item.id + '\n' + item.type + ' ' + money(item.amount) + ' / ' + item.interval + '\nBerikutnya: ' + item.nextDate + '\nProses manual: .runrecurring ' + item.id);
      }
      if (command === 'runrecurring') {
        if (!a) return ctx.reply('Format: .runrecurring ID');
        const item = await service.runRecurring(ctx.sender, a);
        return ctx.reply('Transaksi rutin diproses. Jadwal berikutnya: ' + item.nextDate);
      }
      if (command === 'exportfinance') return ctx.reply('CSV keuangan:\n' + service.exportCsv(ctx.sender).slice(0, 12000));
      if (command === 'debtreport') {
        const debts = service.get(ctx.sender).debts;
        return ctx.reply(debts.length ? ['DAFTAR UTANG', ...debts.map(item => item.name + ' | ' + money(item.principal - item.paid) + ' | ' + item.status + ' | ' + item.id)].join('\n') : 'Belum ada utang.');
      }
      const month = command === 'yearly' ? (a ? String(a).slice(0, 4) : new Date().toISOString().slice(0, 4)) : (a || new Date().toISOString().slice(0, 7));
      const report = service.summary(ctx.sender, month);
      if (['budget', 'budgetcheck'].includes(command)) return ctx.reply(report.budgets.length ? ['ANGGARAN ' + report.month, ...report.budgets.map(item => item.category + ': ' + money(item.spent) + ' / ' + money(item.limit) + ' | sisa ' + money(item.remaining))].join('\n') : 'Belum ada anggaran. Gunakan .setbudget kategori nominal.');
      return ctx.reply(['FINANCE DASHBOARD ' + report.month, 'Pemasukan: ' + money(report.income), 'Pengeluaran: ' + money(report.expense), 'Selisih: ' + money(report.net), 'Saldo bersih tercatat: ' + money(report.balance), 'Sisa utang: ' + money(report.activeDebt), 'Target tabungan aktif: ' + report.goals.length, 'Transaksi bulan ini: ' + report.transactions.length, ...report.budgets.map(item => 'Anggaran ' + item.category + ': ' + money(item.spent) + '/' + money(item.limit))].join('\n'));
    } catch (error) { return ctx.reply('Finance gagal: ' + error.message); }
  }
};
