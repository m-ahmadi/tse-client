const fs = require('fs');
const { promisify } = require('util');
const Big = require('big.js');
Big.DP = 40
Big.RM = 2;
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const settings = require('./settings');
const getSelectedInstruments = require('./lib/getSelectedInstruments');
const getShares = require('./lib/getShares');
const getColumns = require('./lib/getColumns');
const getInstrumentPrices = require('./lib/getInstrumentPrices');
const util = require('./lib/util');
const Column = require('./struct/Column');

module.exports = async function () {
	const selectedInstruments = await getSelectedInstruments(true);
	const prices = {};
	for (v of selectedInstruments) {
		prices[v.InsCode] = await getInstrumentPrices(v.InsCode);
	}
	const columns = await getColumns();
	
	let headerRow = '';
	if (settings.showHeaders) {
		for (column of columns) {
			if (column.Visible) {
				headerRow += column.Header + ',';
			}
		}
		headerRow = headerRow.slice(0, -1);
		headerRow += '\n';
	}
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
				if (column.Visible && (!Big(closingPrice.ZTotTran).eq(0) || settings.daysWithoutTrade) ) {
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
};

// helpers
function adjustPrices(cond, closingPrices, shares, insCode) {
	const cp = closingPrices;
	const len = closingPrices.length;
	const res = [];
	if ( (cond === 1 || cond === 2) && len > 1 ) {
		let gaps = new Big('0.0');
		let num = new Big('1.0');
		res.push( cp[len-1] );
		if (cond === 1) {
			for (let i=len-2; i>=0; i-=1) {
				if ( !Big(cp[i].PClosing).eq(cp[i+1].PriceYesterday) ) {
					gaps = gaps.plus(1);
				}
			}
		}
		if ( (cond === 1 && gaps.div(len).lt('0.08')) || cond === 2 ) {
			for (let i=len-2; i>=0; i-=1) {
				const curr = cp[i];
				const next = cp[i+1];
				const pricesDontMatch = !Big(curr.PClosing).eq(next.PriceYesterday);
				const targetShare = shares.find(share => share.InsCode === insCode && share.DEven === next.DEven);
				
				if (cond === 1 && pricesDontMatch) {
					num = num.times(next.PriceYesterday).div(curr.PClosing);
				} else if (cond === 2 && pricesDontMatch && targetShare) {
					const oldShares = targetShare.NumberOfShareOld;
					const newShares = targetShare.NumberOfShareNew;
					num = num.times(oldShares).div(newShares);
				}
				
				let
				close = num.times(curr.PClosing).round(2).toFixed(2),
				last  = num.times(curr.PDrCotVal).round(2).toFixed(2),
				low   = num.times(curr.PriceMin).round().toString(),
				high  = num.times(curr.PriceMax).round().toString(),
				yday  = num.times(curr.PriceYesterday).round().toString(),
				first = num.times(curr.PriceFirst).round(2).toFixed(2);
				
				const adjustedClosingPrice = {
					InsCode:        curr.InsCode,
					DEven:          curr.DEven,
					PClosing:       close,           // close
					PDrCotVal:      last,            // last
					ZTotTran:       curr.ZTotTran,
					QTotTran5J:     curr.QTotTran5J,
					QTotCap:        curr.QTotCap,
					PriceMin:       low,             // low
					PriceMax:       high,            // high
					PriceYesterday: yday,            // yesterday
					PriceFirst:     first            // first
				};
				
				res.push(adjustedClosingPrice);
			}
		}
	}
	return res.reverse();
	// return res;
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