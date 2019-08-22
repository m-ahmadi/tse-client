const fs = require('fs');
const { promisify } = require('util');
const xmljs = require('xml-js');
const u = require('util-ma');

const rq = require('./lib/request');
const compress = require('./lib/compress');
const getInstruments = require('./lib/getInstruments');
const getSelectedInstruments = require('./lib/getSelectedInstruments');
const Instrument = require('./struct/Instrument');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

(async function () {
	let instruments = await getInstruments();
	let selectedInstruments = await getSelectedInstruments(true);
	
	let insCodes = "";
	for (instrument in selectedInstruments) {
		insCodes += instrument.InsCode + ',';
		insCodes += instrument.DEven + ',';
		insCodes += instrument.YMarNSC === 'NO' ? 0 : 1;
		insCodes += ';';
	}
	insCodes = insCodes.slice(0, -1);
	insCodes = compress(insCodes);
	
	const axiosRes = await rq.DecompressAndGetInsturmentClosingPrice(insCodes).catch(console.log);
	const response = xmljs.xml2js(axiosRes.data);
	let data = response.elements[0].elements[0].elements[0].elements[0].elements[0].text;
	
	if ( !u.isEmptyStr(data) ) {
		data = data.split('@').map( v => v.replace(/;/g, '\n') );
		selectedInstruments.forEach((v, i) => {
			writeFile(`./data/${v.InsCode}.csv`, data[i]);
		});
	} else {
		throw new Error('Invalid ClosingPrice data!');
	}
})();

/* selectedInstruments = selectedInstruments.map(v => {
		const pattern = '^'+v+'.*$';
		const re = new RegExp(pattern, 'm');
		const result = insStr.match(re);
		if ( !u.isEmptyStr(result) ) {
			return new Instrument( result[0] );
		} else {
			throw new Error(`Selected instrument: ${v} not found in instruments!`);
		}
	}); */