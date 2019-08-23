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
	let selectedInstruments = await getSelectedInstruments(true);
	
	let insCosingPrices = {};
	for (instrument of selectedInstruments) {
		const insCode = instrument.InsCode;
		const cpstr = await readFile(`./data/${insCode}.csv`, 'utf8');
		insCosingPrices[insCode] = cpstr.split('\n').map( row => new ClosingPriceRow(row) );
	}
	
	// if (instrument.YMarNSC != "ID")
	const colstr = await readFile('./state/Columns.csv', 'utf8');
	const colstrlf = colstr.match(/\r\n/g) !== null ? colstr.replace(/\r\n/g, '\n') : colstr;
	let columns = colstrlf.slice(0, -1).split('\n').map( v => new ColumnConfig(v) );
	
	let headerRow = '';
	for (column of columns) {
		headerRow += column.Header + ',';
	}
	headerRow = headerRow.slice(0, -1);
	headerRow += '\n';
	
	let files = [];
	files = selectedInstruments.map(instrument => insCosingPrices[instrument.InsCode]);
	files = files.map(closingPrice => {
		let str = '';
		for (column of columns) {
			switch (column.Type) {
				// case 'Symbol'
			}
		}
	});
	
	var x = n;
})()