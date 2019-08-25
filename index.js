const fs = require('fs');
const { promisify } = require('util');
const jalaali = require('jalaali-js');
const writeFile = promisify(fs.writeFile);

const settings = require('./lib/settings');
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
	
	const colstr = await readFile('./state/Columns.csv', 'utf8');
	const colstrlf = colstr.match(/\r\n/g) !== null ? colstr.replace(/\r\n/g, '\n') : colstr;
	let columns = colstrlf.slice(0, -1).split('\n').map( v => new ColumnConfig(v) );
	
	let headerRow = '';
	for (column of columns) {
		headerRow += column.Header + ',';
	}
	headerRow = headerRow.slice(0, -1);
	headerRow += '\n';
	
	let files = selectedInstruments.map(v => insCosingPrices[v.InsCode]);
	files = files.map(closingPrices => {
		const instrument = selectedInstruments.find(v => v.InsCode === closingPrices[0].InsCode);
		let str = headerRow;
		closingPrices.forEach(closingPrice => {
			for (column of columns) {
				str += getCell(instrument, closingPrice, column.Type);
				str += ',';
			}
			str = str.slice(0, -1);
			str += '\n';
		});
		str = str.slice(0, -1);
		return str;
	});
	
	const writes = selectedInstruments.map( (v, i) => {
		const filename = getFilename(settings, v);
		const content = files[i];
		return [filename, content];
	});
	
	for (write of writes) {
		writeFile(`./${write[0]}.csv`, '\ufeff'+write[1], 'utf8'); // utf8 bom
	}
})()


function suffix(YMarNSC, adjustPrices, fa=false) {
	let str = '';
	if (YMarNSC != 'ID') {
		if (adjustPrices === 1) {
			str = fa ? '-ت' : '-a';
		} else if (adjustPrices === 2) {
			str = fa ? '-ا' : '-i';
		}
	}
	return str;
}

function getFilename(settings, instrument) {
	const y = instrument.YMarNSC;
	const a = settings.adjustPrices;
	
	let filename = '';
	switch (settings.filename) {
		case 0:
			filename = instrument.CIsin + suffix(y, a);
			break;
		case 1:
			filename = instrument.LatinName + suffix(y, a);
			break;
		case 2:
			filename = instrument.LatinSymbol + suffix(y, a);
			break;
		case 3:
			filename = instrument.Name + suffix(y, a, true);
			break;
		case 4:
			filename = instrument.Symbol + suffix(y, a, true);
			break;
		default:
			filename = instrument.CIsin + suffix(y, a);
			break;
	}
	return filename;
}

function getCell(instrument, closingPrice, columnType) {
	const y = instrument.YMarNSC;
	const a = settings.adjustPrices;
	let str = '';
	switch (columnType) {
		case 'CompanyCode':
			str += instrument.CompanyCode;
			break;
		case 'LatinName':
			str += instrument.LatinName + suffix(y, a);
			break;
		case 'Symbol':
			str += instrument.Symbol.replace(' ', '_') + suffix(y, a, true);
			break;
		case 'Name':
			str += instrument.Name.replace(' ', '_') + suffix(y, a, true);
			break;
		case 'Date':
			str += closingPrice.DEven;
			break;
		case 'ShamsiDate':
			// str += Utility.ConvertGregorianIntToJalaliInt(closingPrice.DEven);
			break;
		case 'PriceFirst':
			str += closingPrice.PriceFirst;
			break;
		case 'PriceMax':
			str += closingPrice.PriceMax;
			break;
		case 'PriceMin':
			str += closingPrice.PriceMin;
			break;
		case 'LastPrice':
			str += closingPrice.PDrCotVal;
			break;
		case 'ClosingPrice':
			str += closingPrice.PClosing;
			break;
		case 'Price':
			str += closingPrice.QTotCap;
			break;
		case 'Volume':
			str += closingPrice.QTotTran5J;
			break;
		case 'Count':
			str += closingPrice.ZTotTran;
			break;
		case 'PriceYesterday':
			str += closingPrice.PriceYesterday;
			break;
	}
	return str;
}