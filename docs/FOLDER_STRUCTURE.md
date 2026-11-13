# Standar Struktur Folder BASEBOT

Dokumen ini adalah kontrak struktur. Perpindahan kode dilakukan bertahap dengan adapter kompatibilitas; jangan memindahkan banyak modul sekaligus tanpa memperbarui seluruh import, test, dokumentasi, dan script.

## Struktur target

```text
.
├── index.js                     # Entry point stabil untuk npm start
├── package.json
├── config/                      # Contoh konfigurasi non-secret dan schema bila diperlukan
├── src/
│   ├── bootstrap/               # Composition root: merakit dependency dan lifecycle aplikasi
│   ├── config/                  # Loader, normalizer, validator konfigurasi
│   ├── core/
│   │   ├── client/              # Kontrak client dan facade transport
│   │   ├── connection/          # Lifecycle koneksi, pairing, reconnect
│   │   ├── events/              # Adapter event masuk
│   │   ├── messaging/            # Parser, context, dispatcher, menu
│   │   ├── plugins/              # Discovery, validation, registry, lifecycle plugin
│   │   ├── security/             # Permission, URL policy, sanitasi
│   │   └── services/             # Logger, storage, media, message, sticker services
│   ├── integrations/
│   │   └── whatsapp/             # Adapter provider WhatsApp/Baileys
│   ├── shared/
│   │   ├── constants/
│   │   ├── errors/
│   │   ├── utils/
│   │   └── validators/
│   └── legacy/                   # Adapter sementara untuk API helper lama
├── plugins/
│   ├── ai/
│   ├── downloader/
│   ├── group/
│   ├── media/
│   ├── owner/
│   └── system/
├── storage/                      # Runtime data; tidak berisi source atau credential contoh
│   ├── temp/
│   └── data/
├── logs/                         # Runtime logs, tidak di-commit
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── fixtures/
│   └── helpers/
├── scripts/                      # Tooling maintenance, migration, release
└── docs/
    ├── architecture/
    ├── development/
    └── operations/
```

## Aturan dependensi

1. `index.js` hanya memanggil bootstrap dan menangani kegagalan startup.
2. `bootstrap` boleh merakit modul, tetapi tidak boleh berisi business logic command.
3. `core` tidak boleh mengimpor file dari `plugins`; plugin menggunakan API context dan service yang disediakan core.
4. Plugin tidak boleh mengimpor file plugin lain secara langsung. Kebutuhan lintas-plugin harus menjadi service atau dependency yang dideklarasikan.
5. Implementasi Baileys berada di lapisan integrasi. Core menggunakan kontrak/facade, bukan detail library provider.
6. `shared` hanya berisi kode murni tanpa side effect dan tanpa ketergantungan pada WhatsApp.
7. Runtime data, session, log, dan temp harus berada di luar source, tidak masuk Git, dan memakai permission minimum.
8. Hindari barrel file yang membuat circular dependency. Import modul langsung dan jaga arah dependensi satu arah.

## Kontrak plugin

Satu file = satu plugin atau satu tanggung jawab kecil. Metadata wajib divalidasi sebelum registrasi. Plugin hanya menerima `ctx`; akses jaringan, media, storage, dan messaging melalui `ctx.services`. Setiap operasi eksternal wajib memiliki timeout, batas ukuran, validasi input/output, serta cleanup `finally` untuk resource sementara.

## Aturan migrasi aman

- Jangan menghapus path lama sebelum adapter kompatibilitas dan semua import/test diperbarui.
- Jangan mengubah nama command, alias, permission, output, atau perilaku default sebagai efek samping pemindahan file.
- Setiap batch pemindahan harus memperbarui import statis/dinamis, `package.json`, README, docs, dan test.
- Jalankan `npm ci`, `npm test`, `npm run check`, audit dependency, serta smoke test startup tanpa login sebelum merge.
- Tes koneksi WhatsApp dilakukan terpisah dengan akun uji; jangan menganggap unit test sebagai bukti pairing/live connection berhasil.
- Perubahan struktur masuk melalui branch dan pull request. Jangan force-push atau menulis langsung ke `main`.
