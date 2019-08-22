const fs = require('fs');
const readFile = require('util').promisify(fs.readFile);
const u = require('util-ma');

const getInstruments = require('./lib/getInstruments');
const Instrument = require('./struct/Instrument');

module.exports = async function (struct=false) {
	const csvstr = await readFile('./state/SelectedInstruments.csv', 'utf8');
	const csvstrlf = csvstr.match(/\r\n/g) !== null ? csvstr.replace(/\r\n/g, '\n') : csvstr;
	const insCodeArr = csvstrlf.slice(0, -1).split('\n');
	const selectedInsCodes = insCodeArr.map(i => {
		return i.indexOf('\n') !== -1 ? i.slice(0, -1) : i;
	});
	
	if (struct) {
		const instruments = await getInstruments();
		const selectedInstruments = selectedInsCodes.map(insCode => {
			const row = instruments[insCode];
			if ( row && !u.isEmptyStr(row) ) {
				return new Instrument(row);
			} else {
				throw new Error(`Selected instrument: ${insCode} not found in instruments!`);
			}
		});
		
		return selectedInstruments;
	} else {
		return selectedInsCodes;
	}
};