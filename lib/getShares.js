const fs = require('fs');
const readFile = require('util').promisify(fs.readFile);

const Share = require('../struct/Share');

module.exports = async function () {
	const csvstr = await readFile('./data/shares.csv', 'utf8');
	const csvstrlf = csvstr.match(/\r\n/g) !== null ? csvstr.replace(/\r\n/g, '\n') : csvstr;
	const rows = csvstrlf.slice(0, -1).split('\n');
	
	let shares = {};
	
	for (row of rows) {
		shares[ row.split(',', 2)[1] ] = new Share(row);
	}
	
	return shares;
};