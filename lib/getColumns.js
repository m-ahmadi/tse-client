const readFileIntoArray = require('./readFileIntoArray');
const Column = require('../struct/Column');

module.exports = async function () {
	let lines = await readFileIntoArray('./state/SelectedColumns.csv');
	if (lines.length < 1) {
		lines = await readFileIntoArray('./state/DefaultColumns.csv');
	}
	const columns = lines.map( v => new Column(v) );
	
	return columns;
};