const fs = require('fs');
const readFile = require('util').promisify(fs.readFile);

const ClosingPrice = require('../struct/ClosingPrice');

module.exports = async function (insCode) {
	const str = await readFile(`./data/${insCode}.csv`, 'utf8');
	const strlf = str.match(/\r\n/g) !== null ? str.replace(/\r\n/g, '\n') : str;
	
	const rows = strlf.split('\n')
	const prices = rows.map( row => new ClosingPrice(row) );
	
	return prices;
};