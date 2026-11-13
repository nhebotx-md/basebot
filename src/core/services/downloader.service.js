'use strict';

const { igdl } = require('../../integrations/providers/instagram');
const { remini } = require('../../integrations/providers/image-enhancer');
const { ytmp3 } = require('../../integrations/providers/youtube');

function createDownloaderService() {
  return Object.freeze({ igdl, remini, ytmp3 });
}

module.exports = { createDownloaderService };
