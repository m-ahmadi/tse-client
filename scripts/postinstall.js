const fs = require('fs');
const { cacheDir } = require('../defaultSettings');

if ( !fs.existsSync(cacheDir) ) {
	fs.mkdirSync(cacheDir);
}