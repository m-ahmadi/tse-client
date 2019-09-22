const fs = require('fs');
const { cacheDir } = require('../state');

if ( !fs.existsSync(cacheDir) ) {
	fs.mkdirSync(cacheDir);
}