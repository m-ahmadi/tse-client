const fs = require('fs');
const { promisify } = require('util');
const jalaali = require('jalaali-js');

const ClosingPriceRow = require('./struct/ClosingPriceRow');

const j = "1380/01/01".split('/').map(v => parseInt(v));
const d = jalaali.toGregorian(j[0], j[1], j[2]);
const date = new Date(d.gy, d.gm - 1, d.gd);
const startDeven = (date.getFullYear()*10000) + ((date.getMonth()+1)*100) + date.getDate();

const readFile = promisify(fs.readFile);

(async function () {
	const csvStr = await readFile('./state/SelectedInstruments.csv', 'utf8');
	let selectedInstruments = csvStr.slice(0, -1).split('\n');
	
	let closingPrices = {};
	for (v of selectedInstruments) {
		const str = await readFile(`./data/${v}.csv`, 'utf8');
		closingPrices[v] = str.split('\n').map( v => new ClosingPriceRow(v) );
	}
	
})()




