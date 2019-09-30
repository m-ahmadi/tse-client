const { join } = require('path');

const settings = require('./settings');
const readFileIntoArray = require('./readFileIntoArray');
const Share = require('../struct/Share');

module.exports = async function (arr=false) {
	const cacheDir = await settings.get('cacheDir');
	const rows = await readFileIntoArray( join(cacheDir, 'shares.csv') );
	
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