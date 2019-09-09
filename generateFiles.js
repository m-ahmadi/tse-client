const fs = require('fs');
const { promisify } = require('util');
const sep = require('path').sep;
const Big = require('big.js');
Big.DP = 40
Big.RM = 2;
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const access = promisify(fs.access);

const defaultSettings = require('./defaultSettings');
const getSelectedInstruments = require('./lib/getSelectedInstruments');
const getShares = require('./lib/getShares');
const getColumns = require('./lib/getColumns');
const getInstrumentPrices = require('./lib/getInstrumentPrices');
const util = require('./lib/util');
const Column = require('./struct/Column');

module.exports = async function (userSettings) {
	const settings = Object.assign(defaultSettings, userSettings);
	const { adjustPrices, delimiter } = settings;
	
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
		const cond = adjustPrices;
		const closingPrices = prices[insCode];
		if (cond === 1 || cond === 2) {
			return adjust(cond, closingPrices, shares, insCode);
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
					str += getCell(column.Type, instrument, closingPrice, adjustPrices);
					str += delimiter;
				}
			}
			str = str.slice(0, -1);
			str += '\n';
		});
		str = str.slice(0, -1);
		return str;
	});
	
	const writes = selectedInstruments.map( (instrument, i) => {
		const filename = getFilename(settings.filename, instrument, adjustPrices);
		const content = files[i];
		return [filename, content];
	});
	
	let dir = settings.outDir;
	let ext = settings.fileExtension;
	await access(dir).catch(err => dir = defaultSettings.outDir);
	dir = dir.endsWith(sep) ? dir : dir+sep;
	ext = ext.startsWith('.') ? ext : '.'+ext;
	const bom = settings.encoding === 1 ? '' : '\ufeff';
	for (write of writes) {
		writeFile(dir+write[0]+ext, bom+write[1], 'utf8');
	}
};

// helpers
function adjust(cond, closingPrices, shares, insCode) {
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

function getFilename(filename, instrument, adjustPrices) {
	const y = instrument.YMarNSC;
	const a = adjustPrices;
	
	let str = '';
	switch (filename) {
		case 0:
			str = instrument.CIsin + suffix(y, a);
			break;
		case 1:
			str = instrument.LatinName + suffix(y, a);
			break;
		case 2:
			str = instrument.LatinSymbol + suffix(y, a);
			break;
		case 3:
			str = instrument.Name + suffix(y, a, true);
			break;
		case 4:
			str = instrument.Symbol + suffix(y, a, true);
			break;
		default:
			str = instrument.CIsin + suffix(y, a);
			break;
	}
	return str;
}

function getCell(columnType, instrument, closingPrice, adjustPrices) {
	const y = instrument.YMarNSC;
	const a = adjustPrices;
	
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