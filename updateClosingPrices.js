const rq = require('./lib/request');
const compress = require('./lib/compress');
const xmljs = require('xml-js');
const fs = require('fs');
const { promisify } = require('util');
const u = require('util-ma');


const writeFile = promisify(fs.writeFile);
const parse = promisify( require('csv-parse') );

(async function (insCodes) {
	const csvStr = await readFile('./state/SelectedInstruments.csv', 'utf8');
	const selectedInstruments = await parse(csvStr);
	
	const axiosRes = await rq.DecompressAndGetInsturmentClosingPrice(insCodes).catch(console.log);
	const response = xmljs.xml2js(axiosRes.data);
	const data = response.elements[0].elements[0].elements[0].elements[0].elements[0].text;
	
	if (!u.isEmptyStr(instruments) && instruments !== '*') {
		writeFile(`./data/${insCode}.csv`, instruments.replace(/;/g, '\n').slice(0, -1) );
	} else {
		throw new Error('Invalid ClosingPrice data!');
	}
})();