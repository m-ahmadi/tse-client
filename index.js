const fs = require('fs');
const { promisify } = require('util');
const jalaali = require('jalaali-js');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const settings = require('./lib/settings');
const getSelectedInstruments = require('./lib/getSelectedInstruments');
const getShares = require('./lib/getShares');
const getColumns = require('./lib/getColumns');
const ClosingPriceRow = require('./struct/ClosingPriceRow');
const ColumnConfig = require('./struct/ColumnConfig');

const j = "1380/01/01".split('/').map(v => parseInt(v));
const d = jalaali.toGregorian(j[0], j[1], j[2]);
const date = new Date(d.gy, d.gm - 1, d.gd);
const startDeven = (date.getFullYear()*10000) + ((date.getMonth()+1)*100) + date.getDate();

(async function () {
	const selectedInstruments = await getSelectedInstruments(true);
	const prices = {};
	for (instrument of selectedInstruments) {
		const insCode = instrument.InsCode;
		const cpstr = await readFile(`./data/${insCode}.csv`, 'utf8');
		prices[insCode] = cpstr.split('\n').map( row => new ClosingPriceRow(row) );
	}
	const columns = await getColumns();
	
	let headerRow = '';
	for (column of columns) {
		headerRow += column.Header + ',';
	}
	headerRow = headerRow.slice(0, -1);
	headerRow += '\n';
	
	const shares = await getShares();
	
	let files = selectedInstruments.map(v => {
		const adjust = settings.adjustPrices;
		const closingPrices = prices[v.InsCode];
		if (adjust === 1 || adjust === 2) {
			return adjustPrices(adjust, closingPrices, shares);
		} else {
			return closingPrices;
		}
	});
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
})();

// helpers
function adjustPrices(cond, closingPrices, shares) {
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
			for (let i=len-2; i >= 0; i-=1) {
				/* Predicate<TseShareInfo> aShareThatsDifferent = p => {
					if (p.InsCode.ToString().Equals(currentItemInscode)) {
							return p.DEven == cp[i + 1].DEven;
					}
					return false;
				}; */
				const pricesDontMatch = cp[i].PClosing != cp[i + 1].PriceYesterday;

				if (cond == 1 && pricesDontMatch) {
					num2 = num2 * cp[i + 1].PriceYesterday / cp[i].PClosing;
				} else if ( cond == 2 && pricesDontMatch && StaticData.TseShares.Exists(aShareThatsDifferent) ) {
					var something = StaticData.TseShares.Find(aShareThatsDifferent);
					var oldShares = something.NumberOfShareOld;
					var newShares = something.NumberOfShareNew;
					num2 = (num2 * oldShares) / newShares;
				}

				res.push({
					InsCode: cp[i].InsCode,
					DEven: cp[i].DEven,
					PClosing: round(num2 * cp[i].PClosing, 2),
					PDrCotVal: round(num2 * cp[i].PDrCotVal, 2),
					ZTotTran: cp[i].ZTotTran,
					QTotTran5J: cp[i].QTotTran5J,
					QTotCap: cp[i].QTotCap,
					PriceMin: round(num2 * cp[i].PriceMin),
					PriceMax: round(num2 * cp[i].PriceMax),
					PriceYesterday: round(num2 * cp[i].PriceYesterday),
					PriceFirst: round(num2 * cp[i].PriceFirst, 2)
				});
			}
			/* cp.Clear();
			for (let i=res.length-1; i>=0; i-=1)
				cp.Add(closingPriceInfoList[index]); */
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

function round(num, decimalPlaces) {
	var d = decimalPlaces || 0;
	var m = Math.pow(10, d);
	var n = +(d ? num * m : num).toFixed(8);
	var i = Math.floor(n), f = n - i;
	var e = 1e-8;
	var r = (f > 0.5 - e && f < 0.5 + e) ?
						((i % 2 == 0) ? i : i + 1) : round(n);
	return d ? r / m : r;
}