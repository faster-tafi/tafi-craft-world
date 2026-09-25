'use strict';
if (require.main === module) {
  global.__CRAFT_WORLD_PROTECTED_ENTRY__ = true;
}
module.exports = require('./runtime-loader').loadEncrypted('index.js');
