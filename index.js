const fs = require('fs');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const settings = require('./settings');
const getSelectedInstruments = require('./lib/getSelectedInstruments');
const getShares = require('./lib/getShares');
const getColumns = require('./lib/getColumns');
const getInstrumentPrices = require('./lib/getInstrumentPrices');
const util = require('./lib/util');
const Column = require('./struct/Column');

(async function () {
	const selectedInstruments = await getSelectedInstruments(true);
	const prices = {};
	for (v of selectedInstruments) {
		prices[v.InsCode] = await getInstrumentPrices(v.InsCode);
	}
	const columns = await getColumns();
	
	let headerRow = '';
	for (column of columns) {
		if (column.Visible) {
			headerRow += column.Header + ',';
		}
	}
	headerRow = headerRow.slice(0, -1);
	headerRow += '\n';
	
	const shares = await getShares(true);
	
	let files = selectedInstruments.map(v => {
		const insCode = v.InsCode;
		const cond = settings.adjustPrices;
		const closingPrices = prices[insCode];
		if (cond === 1 || cond === 2) {
			return adjustPrices(cond, closingPrices, shares, insCode);
		} else {
			return closingPrices;
		}
	});
	files = files.map(closingPrices => {
		const instrument = selectedInstruments.find(v => v.InsCode === closingPrices[0].InsCode);
		let str = headerRow;
		closingPrices.forEach(closingPrice => {
			for (column of columns) {
				if (column.Visible) {
					str += getCell(instrument, closingPrice, column.Type);
					str += ',';
				}
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
})();

// helpers
function adjustPrices(cond, closingPrices, shares, insCode) {
	const cp = closingPrices;
	const len = closingPrices.length;
	const res = [];
	if ( (cond == 1 || cond == 2) && len > 1 ) {
		let num2 = 1;
		res.push( cp[len-1] );
		let gaps = 0.0;
		if (cond == 1) {
			for (let i=len-2; i>=0; i-=1) {
				if (cp[i].PClosing != cp[i + 1].PriceYesterday) {
						gaps += 1;
				}
			}
		}
		if (cond == 1 && (gaps / len < 0.08 || cond == 2)) {
			for (let i=len-2; i>=0; i-=1) {
				const pricesDontMatch = cp[i].PClosing != cp[i+1].PriceYesterday;
				const targetShare = shares.find(share => share.InsCode === insCode && share.DEven === cp[i+1].DEven);
				
				if (cond == 1 && pricesDontMatch) {
					num2 = (num2 * cp[i+1].PriceYesterday) / cp[i].PClosing;
				} else if ( cond == 2 && pricesDontMatch && targetShare ) {
					var oldShares = targetShare.NumberOfShareOld;
					var newShares = targetShare.NumberOfShareNew;
					num2 = (num2 * oldShares) / newShares;
				}

				res.push({
					InsCode: cp[i].InsCode,
					DEven: cp[i].DEven,
					PClosing: round(num2 * cp[i].PClosing, 2),           // close
					PDrCotVal: round(num2 * cp[i].PDrCotVal, 2),         // last
					ZTotTran: cp[i].ZTotTran,
					QTotTran5J: cp[i].QTotTran5J,
					QTotCap: cp[i].QTotCap,
					PriceMin: round(num2 * cp[i].PriceMin),              // min
					PriceMax: round(num2 * cp[i].PriceMax),              // max
					PriceYesterday: round(num2 * cp[i].PriceYesterday),  // yesterday
					PriceFirst: round(num2 * cp[i].PriceFirst, 2)        // first
				});
			}
		}
	}
	return res;
}

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
			str += util.gregToShamsi(closingPrice.DEven);
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

function round(n, d=2) {
	var x = n * Math.pow(10, d);
	var r = Math.round(x);
	var br = Math.abs(x) % 1 === 0.5 ? (r % 2 === 0 ? r : r-1) : r;
	return br / Math.pow(10, d);
}