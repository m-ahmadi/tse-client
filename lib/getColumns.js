const readFileIntoArray = require('./readFileIntoArray');
const Column = require('../struct/Column');

async function fromFile(defaults=false) {
	let rows = await readFileIntoArray('./state/SelectedColumns.csv');
	if (defaults || rows.length < 1) {
		rows = await readFileIntoArray('./state/DefaultColumns.csv');
	}
	
	return rows.map( i => new Column(i) );
}

module.exports = function (fromStr='') {
	if (fromStr) {
		return fromStr.replace(/;| /g, '\n').split('\n').map( i => new Column(i) );
	} else {
		return fromFile;
	}
};