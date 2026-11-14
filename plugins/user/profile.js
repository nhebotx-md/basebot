'use strict';

module.exports = {
  name: 'profile',
  commands: ['profile', 'me'],
  category: 'user',
  description: 'Melihat profil, level, EXP, koin, dan statistik pengguna.',
  usage: '.profile',
  permissions: {},
  async execute(ctx) {
    const users = ctx.services?.users;
    if (!users) {
      await ctx.reply('Layanan profil belum tersedia.');
      return;
    }
    const profile = await users.getProfile(ctx.sender);
    if (!profile) {
      await ctx.reply('Profil belum tersedia. Kirim pesan lagi untuk membuat profil.');
      return;
    }
    const stats = profile.stats || {};
    await ctx.reply([
      '╭─〔 👤 *USER PROFILE* 〕',
      '*│* Nama: *' + String(profile.name || ctx.pushname || 'Pengguna').slice(0, 50) + '*',
      '*│* Level: *' + profile.level + '*',
      '*│* EXP: *' + profile.exp + '*',
      '*│* Coins: *' + profile.coins + '*',
      '*│* Pesan: *' + (stats.messages || 0) + '*',
      '*│* Command: *' + (stats.commands || 0) + '*',
      '*│* Aktivitas grup: *' + (stats.groups || 0) + '*',
      '╰────────────────'
    ].join('\n'));
  }
};