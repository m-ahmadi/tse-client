const fs = require('fs');
const readFile = require('util').promisify(fs.readFile);

const Instrument = require('../struct/Instrument');

module.exports = async function (struct=false, arr=false) {
	const csvstr = await readFile('./data/instruments.csv', 'utf8');
	const csvstrlf = csvstr.match(/\r\n/g) !== null ? csvstr.replace(/\r\n/g, '\n') : csvstr;
	const rows = csvstrlf.slice(0, -1).split('\n');
	
	const instruments = arr ? [] : {};
	
	for (row of rows) {
		const item = struct ? new Instrument(row) : row;
		if (arr) {
			instruments.push(item);
		} else {
			instruments[ row.match(/^\d*\b/)[0] ] = item;
		}
	}
	
	return instruments;
};