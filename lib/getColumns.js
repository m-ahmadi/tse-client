const readFileIntoArray = require('./readFileIntoArray');
const Column = require('../struct/Column');

module.exports = async function () {
	const lines = await readFileIntoArray('./state/Columns.csv');
	const columns = lines.map( v => new Column(v) );
	
	return columns;
};