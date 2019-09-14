const fs = require('fs');
const readFile = require('util').promisify(fs.readFile);

module.exports = async function (path) {
	const str = await readFile(path, 'utf8');
	
	const lfstr = str.match(/\r\n/g) !== null ? str.replace(/\r\n/g, '\n') : str;
	const rdystr = lfstr.endsWith('\n') ? lfstr.slice(0, -1) : lfstr;
	const arr = rdystr.split('\n');
	
	return arr;
}