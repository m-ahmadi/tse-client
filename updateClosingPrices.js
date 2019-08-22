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
	const insStr = await readFile('./data/instruments.csv', 'utf8');
	let instruments = {};
	insStr.split('\n').forEach(v => {
		instruments[ v.match(/^\d*\b/)[0] ] = v;
	});
	let selectedInstruments = await getSelectedInstruments();
	
	selectedInstruments = selectedInstruments.map(v => {
		const row = instruments[v];
		if ( row && !u.isEmptyStr(row) ) {
			return new Instrument(row);
		} else {
			throw new Error(`Selected instrument: ${v} not found in instruments!`);
		}
	});
	
	let insCodes = "";
	selectedInstruments.forEach(v => {
		insCodes += v.InsCode + ',';
		insCodes += v.DEven + ',';
		insCodes += v.YMarNSC === 'NO' ? 0 : 1;
		insCodes += ';';
	});
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