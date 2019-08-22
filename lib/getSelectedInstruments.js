const fs = require('fs');
const readFile = require('util').promisify(fs.readFile);

module.exports = async function () {
	const csvstr = await readFile('./state/SelectedInstruments.csv', 'utf8');
	const csvstrlf = csvstr.match(/\r\n/g) !== null ? csvstr.replace(/\r\n/g, '\n') : csvstr;
	const arr = csvstrlf.slice(0, -1).split('\n');
	const selectedInstruments = arr.map(i => {
		return i.indexOf('\n') !== -1 ? i.slice(0, -1) : i;
	});
	return selectedInstruments;
};