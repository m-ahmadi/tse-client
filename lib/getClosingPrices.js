const readFileIntoArray = require('./readFileIntoArray');
const ClosingPrice = require('../struct/ClosingPrice');

module.exports = async function (insCode) {
	const rows = await readFileIntoArray(`./data/${insCode}.csv`);
	const prices = rows.map( row => new ClosingPrice(row) );
	
	return prices;
};