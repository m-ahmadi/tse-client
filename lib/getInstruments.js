const fs = require('fs');
const readFile = require('util').promisify(fs.readFile);

const Instrument = require('../struct/Instrument');

module.exports = async function (struct=false) {
	const csvstr = await readFile('./data/instruments.csv', 'utf8');
	const csvstrlf = csvstr.match(/\r\n/g) !== null ? csvstr.replace(/\r\n/g, '\n') : csvstr;
	const rows = csvstrlf.slice(0, -1).split('\n');
	
	let instruments = {};
	
	if (struct) {
		for (row of rows) {
			instruments[ row.match(/^\d*\b/)[0] ] = new Instrument(row);
		}
	} else {
		for (row of rows) {
			instruments[ row.match(/^\d*\b/)[0] ] = row;
		}
	}
	
	return instruments;
};