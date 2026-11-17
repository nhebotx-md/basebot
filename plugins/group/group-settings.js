'use strict';

const USAGE = [
  'Format: .grupset <opsi> <nilai>',
  'Opsi/nilai:',
  'pengumuman on|off — batasi pesan ke admin / buka untuk semua',
  'akses locked|unlocked — batasi / buka edit info grup',
  'tambah all|admin — siapa yang boleh menambahkan anggota',
  'persetujuan on|off — persetujuan permintaan bergabung',
  'pesan off|24h|7d|90d — pesan sementara'
].join('\n');

module.exports = {
  name: 'group-settings',
  commands: ['grupset', 'groupconfig'],
  category: 'group',
  description: 'Mengubah pengaturan grup.',
  usage: '.grupset <pengumuman|akses|tambah|persetujuan|pesan> <nilai>',
  permissions: { groupOnly: true, adminOnly: true, botAdminOnly: true },
  async execute(ctx) {
    const args = String(ctx.text || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (args.length !== 2) return ctx.reply(USAGE);

    const [setting, value] = args;
    const validValues = {
      pengumuman: ['on', 'off'], announcement: ['on', 'off'],
      akses: ['locked', 'unlocked'], access: ['locked', 'unlocked'],
      tambah: ['all', 'admin'], add: ['all', 'admin'],
      persetujuan: ['on', 'off'], approval: ['on', 'off'],
      pesan: ['off', '24h', '7d', '90d'], disappearing: ['off', '24h', '7d', '90d']
    };
    if (!validValues[setting] || !validValues[setting].includes(value)) return ctx.reply(USAGE);

    const client = ctx.client;
    const jid = ctx.chat;
    let method;
    let argsForMethod;
    let confirmation;

    if (setting === 'pengumuman' || setting === 'announcement') {
      method = 'groupSettingUpdate';
      argsForMethod = [jid, value === 'on' ? 'announcement' : 'not_announcement'];
      confirmation = value === 'on' ? 'Mode pengumuman diaktifkan; hanya admin dapat mengirim pesan.' : 'Grup dibuka agar semua anggota dapat mengirim pesan.';
    } else if (setting === 'akses' || setting === 'access') {
      method = 'groupSettingUpdate';
      argsForMethod = [jid, value];
      confirmation = value === 'locked' ? 'Pengaturan grup dikunci untuk anggota.' : 'Pengaturan grup dibuka untuk anggota.';
    } else if (setting === 'tambah' || setting === 'add') {
      method = 'groupMemberAddMode';
      argsForMethod = [jid, value === 'all' ? 'all_member_add' : 'admin_add'];
      confirmation = value === 'all' ? 'Semua anggota kini dapat menambahkan anggota.' : 'Hanya admin yang dapat menambahkan anggota.';
    } else if (setting === 'persetujuan' || setting === 'approval') {
      method = 'groupJoinApprovalMode';
      argsForMethod = [jid, value];
      confirmation = value === 'on' ? 'Persetujuan permintaan bergabung diaktifkan.' : 'Persetujuan permintaan bergabung dinonaktifkan.';
    } else {
      method = 'groupToggleEphemeral';
      const seconds = value === 'off' ? 0 : ({ '24h': 86400, '7d': 604800, '90d': 7776000 })[value];
      argsForMethod = [jid, seconds];
      confirmation = value === 'off' ? 'Pesan sementara dinonaktifkan.' : `Pesan sementara diatur ke ${value}.`;
    }

    if (typeof client?.[method] !== 'function') return ctx.reply('Pengaturan ini belum didukung oleh koneksi bot.');
    try {
      await client[method](...argsForMethod);
      return ctx.reply(confirmation);
    } catch {
      return ctx.reply('Pengaturan tidak berhasil diubah. Pastikan bot masih admin dan coba lagi.');
    }
  }
};
