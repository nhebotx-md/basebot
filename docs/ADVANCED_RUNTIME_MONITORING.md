# Advanced Runtime Monitoring

MUSE-MD mengambil snapshot setiap 30 detik dan menyimpan maksimum 120 sampel di memori proses.

## Command owner
- `.health`: status runtime, WhatsApp, database, plugin, heap, event loop, dan auto reload.
- `.health detail`: detail komponen dan metrik.
- `.health history`: 10 sampel terbaru.
- `.health alerts`: 10 alert terbaru.
- `.health plugins` dan `.health memory`: diagnostik khusus.

## Ambang alert
- Heap usage >= 90%.
- Event-loop p95 >= 250 ms.
- Antrean write database >= 100 operasi.

Alert mencatat transisi dan pemulihan. Tidak ada pesan otomatis, restart otomatis, ping tersembunyi ke WhatsApp, atau histori permanen. Riwayat dan alert dibatasi per proses.
