const path = require('path');

const readFileIntoArray = require('./readFileIntoArray');
const { cacheDir } = require('../defaultSettings');
const Instrument = require('../struct/Instrument');

module.exports = async function (struct=false, arr=false) {
	const rows = await readFileIntoArray( path.join(cacheDir, 'instruments.csv') );
	
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