const fs = require('fs');
const readFile = require('util').promisify(fs.readFile);

const Share = require('../struct/Share');

module.exports = async function (arr=false) {
	const csvstr = await readFile('./data/shares.csv', 'utf8');
	const csvstrlf = csvstr.match(/\r\n/g) !== null ? csvstr.replace(/\r\n/g, '\n') : csvstr;
	const rows = csvstrlf.slice(0, -1).split('\n');
	
	const shares = arr ? [] : {};
	
	for (row of rows) {
		const item = new Share(row);
		if (arr) {
			shares.push(item);
		} else {
			shares[ row.split(',', 2)[1] ] = item;
		}
	}
	
	return shares;
};