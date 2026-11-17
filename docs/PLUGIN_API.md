# Plugin API

Setiap berkas `.js` di bawah `plugins/` harus mengekspor satu object plugin:

```js
module.exports = {
  name: 'ping',
  commands: ['ping', 'p'],
  category: 'system',
  description: 'Memeriksa respons bot.',
  usage: '.ping',
  permissions: {
    ownerOnly: false,
    groupOnly: false,
    privateOnly: false,
    adminOnly: false,
    botAdminOnly: false,
    restricted: false
  },
  async execute(ctx) {
    await ctx.reply('Pong!');
  }
};
```

`name` dan command harus unik tanpa membedakan kapitalisasi. Alias dicantumkan dalam `commands`. `category`, `description`, dan `usage` wajib diisi. Properti `permissions` dapat menghilangkan flag yang tidak digunakan; semua flag yang diberikan harus boolean. `restricted: true` membatasi plugin ke owner, begitu pula ketika bot berada pada mode self. `metadataRequired: true` meminta core memuat metadata grup sebelum membuat context saat command dijalankan di grup; ini berguna untuk plugin yang memeriksa role admin per-subcommand.

Context dibangun oleh core dan berisi `client`/`sock`, `m` (pesan normalisasi), `chatUpdate`, `store`, `registry`, `config`, `logger`, `command`, `prefix`, `args`, `text`, `sender`, `chat`, `pushname`, `isGroup`, `isPrivate`, `isOwner`, `isGroupAdmin`, `isBotAdmin`, `groupMetadata`, `reply`, `react`, `sendMessage`, `quoted`, `mime`, `progress`, `process`, dan `services`. Metadata grup gagal dimuat berarti pemeriksaan admin gagal secara tertutup. `services` berisi service pesan, media unduhan berbatas, storage, logger, `sleep`, `fetchJson`, serta `database`, `users`, dan `groups`. Gunakan `services.users` dan `services.groups`; jangan mengakses file JSON secara langsung.

## Default Fake Quoted Reply

Balasan yang dikirim melalui `ctx.reply()`, `ctx.sendMessage()`, `ctx.services.sendMessage()`, dan pesan status proses memakai contact quote default dengan nama `config.botName` (fallback `ShooNhee-AI`) dan label visual verified. Quote dibuat khusus untuk JID chat tujuan agar tidak memakai remote JID statis dari contoh.

Untuk memakai kutipan pesan asli, teruskan opsi `quoted` secara eksplisit:

```js
await ctx.reply('Balasan ke pesan pengguna', { quoted: ctx.m.raw });
await ctx.sendMessage(ctx.chat, { text: 'Tanpa quote' }, { quoted: null });
```

Helper tersedia dari `src/core/messaging/fake-quoted.js`:

```js
const { createFakeQuoted } = require('../../src/core/messaging/fake-quoted');
const quoted = createFakeQuoted('ShooNhee-AI', true, ctx.chat);
```

Label verified di sini adalah tampilan contact/vCard yang dibentuk bot, bukan verifikasi resmi akun WhatsApp.

### Process Feedback API

Setiap eksekusi command plugin mendapatkan `ctx.progress` dan alias `ctx.process`. Keduanya adalah fungsi untuk mengubah tahap status, dengan method `.start()`, `.update()`/`.step()`, `.complete()`, dan `.fail()`. Dispatcher mengirim satu pesan status, lalu mengedit pesan yang sama untuk setiap tahap. Reaksi tetap dikirim pada awal, selesai, atau gagal. Kegagalan pengiriman status tidak menghentikan proses plugin.

```js
async execute(ctx) {
  await ctx.progress.start('Memvalidasi input', { detail: 'Memeriksa format tautan.' });
  const source = await getSource(ctx.text);
  await ctx.progress.update('Mengunduh media', { detail: 'Mengambil file dari provider.' });
  const media = await downloadMedia(source);
  await ctx.progress.update('Mengirim hasil', { detail: 'Media siap dikirim ke WhatsApp.' });
  await ctx.sendMessage(ctx.chat, { video: media });
  // Dispatcher otomatis menandai berhasil setelah execute selesai.
}
```

Gunakan `.fail('Alasan singkat', { detail: 'Keterangan aman untuk pengguna' })` jika plugin menangani exception sendiri dan tetap melakukan return. Jangan menaruh URL privat, token, path lokal, atau detail sensitif pada pesan progres. Jika `execute` melempar exception, dispatcher otomatis mengubah status menjadi gagal dan mengirim diagnostik error. Lihat [PLUGIN_PROCESS_FEEDBACK.md](./PLUGIN_PROCESS_FEEDBACK.md).

Plugin boleh mendengarkan event tanpa mendaftarkan command palsu sebagai jalur khusus: gunakan `events: ['group-participants.update']` atau `events: ['messages.update']` dan `async onEvent(ctx, event)`. Untuk `messages.update`, `event` adalah payload pembaruan Baileys dan `ctx` menyediakan `client`/`sock`, `config`, `registry`, `logger`, serta `services` minimal; event tidak dipaksa melewati command parser. Error plugin diisolasi dan dicatat; error satu plugin tidak menghentikan listener lain.

## Plugin Manager

Command owner untuk mengelola plugin runtime didokumentasikan di [PLUGIN_MANAGEMENT.md](./PLUGIN_MANAGEMENT.md). Plugin manager tersedia melalui `ctx.services.pluginManager`; API ini hanya diberikan setelah bootstrap membuat registry dan manager. Status enable/disable bersifat runtime dan reload seluruh plugin dilakukan secara staged.

## Baileys Event API

Plugin event harus berlangganan nama event yang diizinkan core. Nama event divalidasi saat plugin dimuat; event arbitrary dan duplikat ditolak. Event dispatcher memasang satu listener per event Baileys dan meneruskan payload hanya ke plugin yang terdaftar.

Plugin dapat mengisi properti events dan onEvent(ctx, event). Event yang tersedia mencakup messages.update, messages.reaction, presence.update, group-participants.update, group.join-request, groups.update, groups.upsert, newsletter.reaction, newsletter.view, newsletter-participants.update, newsletter-settings.update, lid-mapping.update, message-receipt.update, messages.delete, messages.media-update, blocklist.update, dan settings.update.

Event callback menerima ctx.client/ctx.sock, ctx.chat, flag jenis chat, logger, registry, dan service inti. Payload Baileys tersedia sebagai argumen kedua onEvent(ctx, event). Jangan mengirim payload event mentah ke chat atau log karena dapat berisi identitas pengguna.

## Identity Resolver

ctx.services.identity menyediakan resolver PN/LID dengan cache terbatas dan TTL. resolve(jid) mengembalikan identitas nomor telepon bila pemetaan tersedia; jika tidak, ia mempertahankan LID. resolvePair(jid) mengembalikan identity, phoneNumber, lid, dan identities. Core menggunakan resolver ini untuk pemeriksaan owner dan admin. Kegagalan lookup tidak pernah memberikan hak akses.

## Rich Message Builder

ctx.services.richMessage menyediakan sendCode, sendTable, sendLinks, sendRichResponse, sendCarousel, dan sendNativeFlow. Semua metode memvalidasi batas panjang, struktur tabel, jumlah kartu/tombol, bahasa code block, dan URL publik sebelum mengirim. Command richmsg memakai satu plugin dengan payload JSON untuk semua format tersebut.