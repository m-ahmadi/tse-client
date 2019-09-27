const fs = require('fs');

(async function () {
  const cacheDir = await require('../lib/settings').get('cacheDir');
  
  if ( !fs.existsSync(cacheDir) ) {
    fs.mkdirSync(cacheDir);
  }
})();
