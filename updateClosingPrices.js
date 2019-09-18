const fs = require('fs');
const { promisify } = require('util');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

const rq = require('./lib/request.v2');
const getSelectedInstruments = require('./lib/getSelectedInstruments');
const Instrument = require('./struct/Instrument');

module.exports = async function () {
	const selectedInstruments = await getSelectedInstruments(true);
	
	let insCodes = "";
	for (instrument of selectedInstruments) {
		insCodes += instrument.InsCode + ',';
		// insCodes += instrument.DEven + ',';
		insCodes += '20010321' + ',';
		insCodes += instrument.YMarNSC === 'NO' ? 0 : 1;
		insCodes += ';';
	}
	insCodes = insCodes.slice(0, -1);
	
	const axiosRes = await rq.ClosingPrices(insCodes).catch(console.log);
	let data = axiosRes.data;
	
	if (data !== '') {
		data = data.split('@').map( v => v.replace(/;/g, '\n') );
		const writes = selectedInstruments.map( (v, i) => [ v.insCode, data[i] ] );
		for (write of writes) {
			await writeFile(`./data/${write[0]}.csv`, write[1]);
		}
	} else {
		throw new Error('Invalid ClosingPrice data!');
	}
};