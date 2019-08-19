const fs = require('fs');
const { promisify } = require('util');
const jalaali = require('jalaali-js');

const d = jalaali.toGregorian(1380, 01, 01); // "1380/01/01"
const date = new Date(d.gy, d.gm - 1, d.gd);
const startDeven = (date.getFullYear()*10000) + ((date.getMonth()+1)*100) + date.getDate();

const readFile = promisify(fs.readFile);
const parse = promisify( require('csv-parse') );

(async function () {
	const csvStr = await readFile('./state/SelectedInstruments.csv', 'utf8');
	const selectedInstruments = await parse(csvStr);
	
	selectedInstruments.forEach(v => {
		
	});
})()




