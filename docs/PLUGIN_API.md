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

`name` dan command harus unik tanpa membedakan kapitalisasi. Alias dicantumkan dalam `commands`. `category`, `description`, dan `usage` wajib diisi. Properti `permissions` dapat menghilangkan flag yang tidak digunakan; semua flag yang diberikan harus boolean. `restricted: true` membatasi plugin ke owner, begitu pula ketika bot berada pada mode self.

Context dibangun oleh core dan berisi `client`/`sock`, `m` (pesan normalisasi), `chatUpdate`, `store`, `registry`, `config`, `logger`, `command`, `prefix`, `args`, `text`, `sender`, `chat`, `pushname`, `isGroup`, `isPrivate`, `isOwner`, `isGroupAdmin`, `isBotAdmin`, `groupMetadata`, `reply`, `react`, `sendMessage`, `quoted`, `mime`, dan `services`. Metadata grup gagal dimuat berarti pemeriksaan admin gagal secara tertutup. `services` berisi service pesan, media unduhan berbatas, storage, logger, `sleep`, serta `fetchJson` dengan timeout.

Plugin boleh mendengarkan event tanpa mendaftarkan command palsu sebagai jalur khusus: gunakan `events: ['group-participants.update']` dan `async onEvent(ctx, event)`. Event non-command tidak dipaksa melewati command parser. Error plugin diisolasi dan dicatat; error satu plugin tidak menghentikan listener lain.
