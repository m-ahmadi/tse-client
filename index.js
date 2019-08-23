const fs = require('fs');
const { promisify } = require('util');
const jalaali = require('jalaali-js');

const getSelectedInstruments = require('./lib/getSelectedInstruments');
const ClosingPriceRow = require('./struct/ClosingPriceRow');
const ColumnConfig = require('./struct/ColumnConfig');

const j = "1380/01/01".split('/').map(v => parseInt(v));
const d = jalaali.toGregorian(j[0], j[1], j[2]);
const date = new Date(d.gy, d.gm - 1, d.gd);
const startDeven = (date.getFullYear()*10000) + ((date.getMonth()+1)*100) + date.getDate();

const readFile = promisify(fs.readFile);

(async function () {
	let selectedInstruments = await getSelectedInstruments();
	
	let insCosingPrices = {};
	for (v of selectedInstruments) {
		const str = await readFile(`./data/${v}.csv`, 'utf8');
		insCosingPrices[v] = str.split('\n').map( v => new ClosingPriceRow(v) );
	}
	
	// if (instrument.YMarNSC != "ID")
	const colstr = await readFile('./state/Columns.csv', 'utf8');
	let columns = colstr.slice(0, -1).split('\n').map( v => new ColumnConfig(v) );
	let headerRow = '';
	for (column of columns) {
		headerRow += column.Header + ',';
	}
	headerRow.slice(0, -1);
	headerRow += '\n';
	
	let files = selectedInstruments
		.map(insCode => insCosingPrices[insCode])
		.map(closingPrice => {
			let str = '';
			for (column of columns) {
				str += column.CompanyCode
			}
		});
	
	var x = n;
})()