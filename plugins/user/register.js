'use strict';

module.exports = {
  name: 'register-user',
  commands: ['daftar'],
  category: 'user',
  description: 'Mendaftarkan pengguna agar dapat memakai fitur BASEBOT di grup.',
  usage: '.daftar nama',
  permissions: {},
  async execute(ctx) {
    const name = String(ctx.text || '').trim().slice(0, 80);
    if (!name || name.length < 2) {
      await ctx.reply('Format pendaftaran: *' + ctx.prefix + 'daftar nama kamu*');
      return;
    }
    if (!ctx.sender || !ctx.services?.users) {
      await ctx.reply('Identitas akun tidak terbaca. Pendaftaran dibatalkan.');
      return;
    }
    const result = await ctx.services.users.register(ctx.sender, name);
    if (!result.created) {
      await ctx.reply('Akun kamu sudah terdaftar sebagai *' + result.profile.role + '*.');
      return;
    }
    await ctx.reply([
      '╭─〔 ✅ *PENDAFTARAN BERHASIL* 〕',
      '│ Nama: *' + result.profile.name + '*',
      '│ Role: *user*',
      '│ Status: *Aktif*',
      '╰────────────────',
      'Akunmu sudah tersimpan di database BASEBOT. Fitur yang bisa digunakan mengikuti role dan izin akun.'
    ].join('\n'));
  }
};
