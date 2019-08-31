const fs = require('fs');
const readFile = require('util').promisify(fs.readFile);

const ColumnConfig = require('../struct/ColumnConfig');

module.exports = async function () {
	const colstr = await readFile('./state/Columns.csv', 'utf8');
	
	const colstrlf = colstr.match(/\r\n/g) !== null ? colstr.replace(/\r\n/g, '\n') : colstr;
	
	const columns = colstrlf.slice(0, -1).split('\n').map( v => new ColumnConfig(v) );
	
	return columns;
};