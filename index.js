'use strict';

const { startApp } = require('./src/app');
const { createLogger } = require('./src/core/services/logger.service');

if (require.main === module) {
  startApp().catch(error => {
    // Error detail tetap berguna untuk operator, sementara secret disensor logger.
    createLogger({ level: process.env.LOG_LEVEL || 'info' }).error('BASEBOT gagal dijalankan.', { error });
    process.exitCode = 1;
  });
}

module.exports = { startApp };
