'use strict';

function resolveTarget(ctx) {
  const raw = String(ctx.args?.[0] || '').replace(/[^0-9]/g, '');
  if (!/^\d{8,16}$/.test(raw)) return '';
  return raw + '@s.whatsapp.net';
}

module.exports = {
  name: 'user-access-manager',
  commands: ['setrole', 'grantakses', 'cabutakses'],
  category: 'owner',
  description: 'Mengatur role dan akses command/kategori pengguna terdaftar.',
  usage: '.setrole 628xxxx premium | .grantakses 628xxxx command:namacommand',
  permissions: { ownerOnly: true },
  async execute(ctx) {
    const users = ctx.services?.users;
    if (!users) return ctx.reply('UserService belum tersedia.');
    const target = resolveTarget(ctx);
    if (!target) return ctx.reply('Nomor target wajib berupa nomor WhatsApp internasional, contoh: .setrole 6281234567890 premium');
    const action = ctx.command;
    try {
      if (action === 'setrole') {
        const role = String(ctx.args?.[1] || '').toLowerCase();
        const profile = await users.setRole(target, role);
        return ctx.reply('Role *' + profile.role + '* berhasil diterapkan ke *' + profile.name + '* (' + target.split('@')[0] + ').');
      }
      const descriptor = String(ctx.args?.[1] || '').trim().toLowerCase();
      const match = /^(command|kategori):([a-z0-9_-]{1,40})$/.exec(descriptor);
      if (!match) return ctx.reply('Format: .' + action + ' 628xxxx command:namacommand atau kategori:slug');
      const [, typeLabel, value] = match;
      const type = typeLabel === 'kategori' ? 'category' : 'command';
      const profile = action === 'grantakses'
        ? await users.grantAccess(target, type, value)
        : await users.revokeAccess(target, type, value);
      const label = type === 'category' ? 'kategori ' : 'command ';
      return ctx.reply((action === 'grantakses' ? 'Akses diberikan: ' : 'Akses dicabut: ') + '*' + label + value + '* untuk *' + profile.name + '*. Role akun: *' + profile.role + '*.');
    } catch (error) {
      return ctx.reply('Gagal mengubah akses: ' + error.message);
    }
  }
};
