'use strict';

function validJid(value) { return typeof value === 'string' && /^\d[\d-]{4,}@g\.us$/i.test(value); }
function inviteCode(value) {
  const text = String(value || '').trim();
  const match = text.match(/(?:chat\.whatsapp\.com\/)([A-Za-z0-9_-]+)/i);
  const code = match?.[1] || text;
  return /^[A-Za-z0-9_-]{8,64}$/.test(code) ? code : '';
}

module.exports = {
  name: 'community-manager',
  commands: ['community'],
  category: 'owner',
  description: 'Mengelola Community, subgrup, tautan, dan permintaan bergabung.',
  usage: '.community <create|list|info|groups|subgroup|link|unlink|invite|revoke|join|joininfo|leave|rename|description|setting|addmode|ephemeral|approval|requests|approve>',
  permissions: { ownerOnly: true, registrationExempt: true, metadataRequired: true },
  async execute(ctx) {
    const input = String(ctx.text || '').trim();
    const [action, ...args] = input.split(/\s+/);
    const value = args.join(' ').trim();
    const client = ctx.client;
    const unavailable = name => typeof client[name] !== 'function';
    if (!action) return ctx.reply('Format: .community <create|list|info|groups|subgroup|link|unlink|invite|revoke|join|joininfo|leave|approve>.');

    if (action === 'create') {
      const [subject, description = ''] = value.split('|').map(item => item.trim());
      if (!subject || subject.length > 100 || description.length > 500) return ctx.reply('Format: .community create Nama Community | Deskripsi');
      if (unavailable('communityCreate')) return ctx.reply('API Community belum tersedia pada versi Baileys aktif.');
      const result = await client.communityCreate(subject, description);
      return ctx.reply('Community berhasil dibuat.\nNama: ' + subject + '\nID: ' + String(result?.id || 'tidak tersedia'));
    }
    if (action === 'list') {
      if (unavailable('communityFetchAllParticipating')) return ctx.reply('API daftar Community tidak tersedia.');
      const result = await client.communityFetchAllParticipating();
      const entries = Object.values(result || {});
      if (!entries.length) return ctx.reply('Tidak ada Community yang ditemukan.');
      return ctx.reply('Community yang diikuti:\n' + entries.slice(0, 30).map((item, index) => (index + 1) + '. ' + (item.subject || item.name || 'Community') + '\n' + (item.id || '')).join('\n'));
    }
    if (action === 'join' || action === 'joininfo') {
      const code = inviteCode(value);
      if (!code) return ctx.reply('Masukkan kode undangan Community yang valid.');
      const method = action === 'join' ? 'communityAcceptInvite' : 'communityGetInviteInfo';
      if (unavailable(method)) return ctx.reply('API undangan Community tidak tersedia.');
      const result = await client[method](code);
      if (action === 'join') return ctx.reply('Undangan Community diproses.\nID: ' + String(result?.id || result || 'tidak tersedia'));
      return ctx.reply('Informasi Community:\nNama: ' + String(result?.subject || '-') + '\nID: ' + String(result?.id || '-') + '\nAnggota: ' + String(result?.size ?? '-'));
    }
    if (['info', 'groups', 'invite', 'revoke', 'leave'].includes(action)) {
      if (!validJid(value)) return ctx.reply('Masukkan JID Community yang valid (akhiran @g.us).');
      const methods = { info: 'communityMetadata', groups: 'communityFetchLinkedGroups', invite: 'communityInviteCode', revoke: 'communityRevokeInvite', leave: 'communityLeave' };
      const method = methods[action];
      if (unavailable(method)) return ctx.reply('API ' + action + ' Community tidak tersedia.');
      if (action === 'leave') {
        await ctx.reply('Bot akan keluar dari Community.');
        await client.communityLeave(value);
        return;
      }
      const result = await client[method](value);
      if (action === 'info') return ctx.reply('Community:\nNama: ' + String(result?.subject || '-') + '\nID: ' + String(result?.id || '-') + '\nDeskripsi: ' + String(result?.desc || result?.description || '-') + '\nAnggota: ' + String(result?.size ?? '-'));
      if (action === 'groups') {
        const groups = Object.values(result || {});
        return ctx.reply(groups.length ? 'Subgrup terkait:\n' + groups.slice(0, 40).map((item, index) => (index + 1) + '. ' + (item.subject || item.name || 'Grup') + '\n' + (item.id || '')).join('\n') : 'Tidak ada subgrup yang ditemukan.');
      }
      if (action === 'invite') return ctx.reply('Undangan Community:\n' + String(result?.code || result?.inviteCode || result));
      if (action === 'revoke') return ctx.reply('Tautan undangan Community berhasil dicabut.');
    }
    if (action === 'subgroup') {
      const communityJid = args[0];
      const subject = args.slice(1).join(' ').replace(/@\d+/g, '').trim();
      const participants = [...new Set((ctx.m?.mentionedJid || []).filter(jid => typeof jid === 'string' && jid.includes('@')))];
      if (!validJid(communityJid) || !subject || subject.length > 100) return ctx.reply('Format: .community subgroup <communityJid> Nama Subgrup [@anggota]');
      if (unavailable('communityCreateGroup')) return ctx.reply('API pembuatan subgrup tidak tersedia.');
      const created = await client.communityCreateGroup(subject, participants, communityJid);
      return ctx.reply('Subgrup berhasil dibuat.\nNama: ' + subject + '\nID: ' + String(created?.id || 'tidak tersedia'));
    }
    if (action === 'link' || action === 'unlink') {
      const communityJid = args[0];
      if (!validJid(communityJid) || !ctx.isGroup || !ctx.isGroupAdmin || !ctx.isBotAdmin) return ctx.reply('Format: .community ' + action + ' <communityJid> dari grup yang akan diubah. Bot dan pengirim harus admin.');
      const method = action === 'link' ? 'communityLinkGroup' : 'communityUnlinkGroup';
      if (unavailable(method)) return ctx.reply('API tautkan/lepas grup tidak tersedia.');
      await client[method](ctx.chat, communityJid);
      return ctx.reply(action === 'link' ? 'Grup berhasil ditautkan ke Community.' : 'Grup berhasil dilepas dari Community.');
    }
    if (['rename', 'description', 'setting', 'addmode', 'ephemeral', 'approval', 'requests'].includes(action)) {
      const communityJid = args[0];
      const rest = args.slice(1);
      if (!validJid(communityJid)) return ctx.reply('Masukkan JID Community yang valid setelah subcommand.');
      const methods = {
        rename: 'communityUpdateSubject',
        description: 'communityUpdateDescription',
        setting: 'communitySettingUpdate',
        addmode: 'communityMemberAddMode',
        ephemeral: 'communityToggleEphemeral',
        approval: 'communityJoinApprovalMode',
        requests: 'communityRequestParticipantsList'
      };
      const method = methods[action];
      if (unavailable(method)) return ctx.reply('API ' + action + ' Community tidak tersedia.');
      if (action === 'requests') {
        const pending = await client[method](communityJid);
        const entries = Array.isArray(pending) ? pending : Object.values(pending || {});
        return ctx.reply(entries.length ? 'Permintaan bergabung Community:\n' + entries.slice(0, 30).map((item, index) => (index + 1) + '. ' + String(item.jid || item.id || item.phoneNumber || 'Pemohon')).join('\n') : 'Tidak ada permintaan bergabung yang menunggu.');
      }
      const setting = rest.join(' ').trim();
      if (action === 'rename' || action === 'description') {
        const limit = action === 'rename' ? 100 : 500;
        if (!setting || setting.length > limit) return ctx.reply('Masukkan ' + (action === 'rename' ? 'nama' : 'deskripsi') + ' Community baru.');
        await client[method](communityJid, setting);
        return ctx.reply('Metadata Community berhasil diperbarui.');
      }
      if (action === 'setting') {
        if (!['announcement', 'not_announcement', 'locked', 'unlocked'].includes(setting)) return ctx.reply('Setting valid: announcement, not_announcement, locked, unlocked.');
        await client[method](communityJid, setting);
        return ctx.reply('Pengaturan Community berhasil diperbarui.');
      }
      if (action === 'addmode') {
        if (!['admin_add', 'all_member_add'].includes(setting)) return ctx.reply('Mode valid: admin_add atau all_member_add.');
        await client[method](communityJid, setting);
        return ctx.reply('Mode penambahan anggota Community berhasil diperbarui.');
      }
      if (action === 'ephemeral') {
        const seconds = Number(setting);
        if (![0, 86400, 604800, 7776000].includes(seconds)) return ctx.reply('Durasi valid: 0, 86400, 604800, atau 7776000 detik.');
        await client[method](communityJid, seconds);
        return ctx.reply('Durasi pesan sementara Community berhasil diperbarui.');
      }
      if (action === 'approval') {
        if (!['on', 'off'].includes(setting)) return ctx.reply('Mode approval harus on atau off.');
        await client[method](communityJid, setting);
        return ctx.reply('Pengaturan persetujuan anggota Community berhasil diperbarui.');
      }
    }
    if (action === 'approve') {
      const communityJid = args[0];
      const target = ctx.m?.mentionedJid?.length === 1 ? ctx.m.mentionedJid[0] : '';
      if (!validJid(communityJid) || !target) return ctx.reply('Format: .community approve <communityJid> @pemohon');
      if (unavailable('communityRequestParticipantsUpdate')) return ctx.reply('API persetujuan anggota Community tidak tersedia.');
      await client.communityRequestParticipantsUpdate(communityJid, [target], 'approve');
      return ctx.reply('Permintaan bergabung Community telah diproses.');
    }
    return ctx.reply('Subcommand Community tidak dikenal.');
  }
};
