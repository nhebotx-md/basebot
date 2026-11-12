'use strict';

const { startApp } = require('./src/app');

if (require.main === module) {
  startApp().catch(error => {
    // Credential, QR, dan pairing code tidak pernah dicetak dari error startup.
    console.error('BASEBOT gagal dijalankan:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { startApp };
