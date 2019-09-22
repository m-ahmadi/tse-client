const path = require('path');

const state = require('./state');
const readFileIntoArray = require('./readFileIntoArray');
const Instrument = require('../struct/Instrument');

module.exports = async function (struct=false, arr=false) {
	const cacheDir = await state.get('cacheDir');
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