const fs = require('fs');
const { promisify } = require('util');
const xmljs = require('xml-js');
const u = require('util-ma');

const rq = require('./lib/request');
const compress = require('./lib/compress');
const getSelectedInstruments = require('./lib/getSelectedInstruments');
const Instrument = require('./struct/Instrument');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

(async function () {
	let selectedInstruments = await getSelectedInstruments(true);
	
	let insCodes = "";
	for (instrument of selectedInstruments) {
		insCodes += instrument.InsCode + ',';
		// insCodes += instrument.DEven + ',';
		insCodes += '20010321' + ',';
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