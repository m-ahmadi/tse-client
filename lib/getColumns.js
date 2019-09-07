const fs = require('fs');
const readFile = require('util').promisify(fs.readFile);

const Column = require('../struct/Column');

module.exports = async function () {
	const colstr = await readFile('./state/Columns.csv', 'utf8');
	const colstrlf = colstr.match(/\r\n/g) !== null ? colstr.replace(/\r\n/g, '\n') : colstr;
	
	const columns = colstrlf.slice(0, -1).split('\n').map( v => new Column(v) );
	
	return columns;
};