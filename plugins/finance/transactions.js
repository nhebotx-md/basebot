'use strict';
const { amount } = require('../../src/core/services/finance.service');
function money(value) { return 'Rp' + Number(value || 0).toLocaleString('id-ID'); }
module.exports = {
  name: 'finance-transactions',
  commands: ['income', 'pemasukan', 'expense', 'pengeluaran', 'transfer', 'history', 'riwayat', 'searchtrx', 'deletetrx'],
  category: 'finance',
  description: 'Mencatat, mencari, melihat, dan menghapus transaksi keuangan pribadi.',
  usage: '.income 50000 gaji | .expense 15000 makanan | .history [jumlah]',
  permissions: {},
  async execute(ctx) {
    const service = ctx.services?.finance;
    if (!service || !ctx.sender) return ctx.reply('Layanan keuangan belum siap.');
    const [first, ...rest] = ctx.args || [];
    const command = String(ctx.command || '').toLowerCase();
    try {
      if (['income', 'pemasukan', 'expense', 'pengeluaran', 'transfer'].includes(command)) {
        if (!first || !rest.length) return ctx.reply('Format: .' + command + ' nominal kategori | keterangan opsional');
        const item = await service.addTransaction(ctx.sender, { type: ['income', 'pemasukan'].includes(command) ? 'income' : ['expense', 'pengeluaran'].includes(command) ? 'expense' : 'transfer', value: amount(first), category: rest[0], note: rest.slice(1).join(' ') || rest[0] });
        return ctx.reply('Transaksi tersimpan\\nJenis: ' + item.type + '\\nNominal: ' + money(item.amount) + '\\nKategori: ' + item.category + '\\nID: ' + item.id);
      }
      if (command === 'deletetrx') {
        if (!first) return ctx.reply('Format: .deletetrx ID');
        const removed = await service.deleteTransaction(ctx.sender, first);
        return ctx.reply('Transaksi ' + removed.id + ' berhasil dihapus.');
      }
      let items = service.get(ctx.sender).transactions.slice().reverse();
      if (command === 'searchtrx' && first) { const query = [first, ...rest].join(' ').toLocaleLowerCase('id-ID'); items = items.filter(item => [item.category, item.note, item.type, item.id].join(' ').toLocaleLowerCase('id-ID').includes(query)); }
      items = items.slice(0, Math.min(30, Math.max(1, Number(first) || 10)));
      if (!items.length) return ctx.reply('Belum ada transaksi yang cocok.');
      return ctx.reply(['RIWAYAT TRANSAKSI', ...items.map(item => item.date + ' | ' + item.type.toUpperCase() + ' | ' + money(item.amount) + ' | ' + item.category + ' | ' + item.id)].join('\\n'));
    } catch (error) { return ctx.reply('Transaksi gagal: ' + error.message); }
  }
};
