const tse = (function () {

const rq = {
	Instrument(DEven) {
		const params = {
			t: 'Instrument',
			a: ''+DEven
		};
		return this.makeRequest(params);
	},
	InstrumentAndShare(DEven, LastID=0) {
		const params = {
			t: 'InstrumentAndShare',
			a: ''+DEven,
			a2: ''+LastID
		};
		return this.makeRequest(params);
	},
	LastPossibleDeven() {
		const params = {
			t: 'LastPossibleDeven'
		};
		return this.makeRequest(params);
	},
	ClosingPrices(insCodes) {
		const params = {
			t: 'ClosingPrices',
			a: ''+insCodes
		};
		return this.makeRequest(params);
	},
	makeRequest(params) {
		const url = new URL('http://service.tsetmc.com/tsev2/data/TseClient2.aspx')
		url.search = new URLSearchParams(params).toString();
		
		return new Promise((resolve, reject) => {
			fetch(url).then(async res => resolve(await res.text()) ).catch(err => reject(err))
		});
		
		/* return $.ajax({
			url: 'http://service.tsetmc.com/tsev2/data/TseClient2.aspx',
			method: 'GET',
			data: params
		}); */
	}
};
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// structs
class ClosingPrice {
	constructor(_row='') {
		const row = _row.split(',');
		if (row.length !== 11) throw new Error('Invalid ClosingPrice data!');
		this.InsCode        = row[0];  // int64
		this.DEven          = row[1];  // int32 (the rest are all decimal)
		this.PClosing       = row[2];  // close
		this.PDrCotVal      = row[3];  // last
		this.ZTotTran       = row[4];  // count
		this.QTotTran5J     = row[5];  // volume
		this.QTotCap        = row[6];  // price
		this.PriceMin       = row[7];  // low
		this.PriceMax       = row[8];  // high
		this.PriceYesterday = row[9];  // yesterday
		this.PriceFirst     = row[10]; // open
	}
}
const cols  = ['CompanyCode', 'LatinName', 'Symbol', 'Name', 'Date', 'ShamsiDate', 'PriceFirst', 'PriceMax', 'PriceMin', 'LastPrice', 'ClosingPrice', 'Price', 'Volume', 'Count', 'PriceYesterday'];
const colsFa = ['کد شرکت', 'نام لاتین', 'نماد', 'نام', 'تاریخ میلادی', 'تاریخ شمسی', 'اولین قیمت', 'بیشترین قیمت', 'کمترین قیمت', 'آخرین قیمت', 'قیمت پایانی', 'ارزش', 'حجم', 'تعداد معاملات', 'قیمت دیروز'];
class Column {
	constructor(row=[]) {	
		const len = row.length;
		if (len > 2 || len < 1) throw new Error('Invalid Column data!');
		this.name   = cols[ row[0] ];
		this.fname  = colsFa[ row[0] ];
		this.header = row[1];
	}
}
class Instrument {
	constructor(_row='') {
		const row = _row.split(',');
		if (row.length !== 18) throw new Error('Invalid Instrument data!');
		this.InsCode      = row[0];  // int64 (long)
		this.InstrumentID = row[1];
		this.LatinSymbol  = row[2];
		this.LatinName    = row[3];
		this.CompanyCode  = row[4];
		this.Symbol       = cleanFa(row[5]);
		this.Name         = row[6];
		this.CIsin        = row[7];
		this.DEven        = row[8];  // int32 (int)
		this.Flow         = row[9];  // 0,1,2,3,4,5,6,7 بازار byte
		this.LSoc30       = row[10]; // نام 30 رقمي فارسي شرکت
		this.CGdSVal      = row[11]; // A,I,O نوع نماد
		this.CGrValCot    = row[12]; // 00,11,1A,...25 کد گروه نماد
		this.YMarNSC      = row[13]; // NO,OL,BK,BY,ID,UI کد بازار
		this.CComVal      = row[14]; // 1,3,4,5,6,7,8,9 کد تابلو
		this.CSecVal      = row[15]; // []62 کد گروه صنعت
		this.CSoSecVal    = row[16]; // []177 کد زير گروه صنعت
		this.YVal         = parseInt(row[17], 10);
	}
}
class Share {
	constructor(_row='') {
		const row = _row.split(',');
		if (row.length !== 5) throw new Error('Invalid Share data!');
		this.Idn              = row[0];      // long
		this.InsCode          = row[1];      // long
		this.DEven            = row[2];      // int
		this.NumberOfShareNew = parseInt( row[3] ); // Decimal
		this.NumberOfShareOld = parseInt( row[4] ); // Decimal
	}
}
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// utils
function parseInstruments(struct=false, arr=false) {
	const rows = localStorage.getItem('tse.instruments').split(';');
	const instruments = arr ? [] : {};
	for (const row of rows) {
		const item = struct ? new Instrument(row) : row;
		if (arr) {
			instruments.push(item);
		} else {
			instruments[ row.match(/^\d+\b/)[0] ] = item;
		}
	}
	return instruments;
};
function parseShares(arr=false) {
	const rows = localStorage.getItem('tse.shares').split(';')
	const shares = arr ? [] : {};
	for (const row of rows) {
		const item = new Share(row);
		if (arr) {
			shares.push(item);
		} else {
			shares[ row.split(',', 2)[1] ] = item;
		}
	}
	return shares;
};
function dateToStr(d) {
  return (d.getFullYear()*10000) + ( (d.getMonth()+1)*100 ) + d.getDate() + '';
}
function cleanFa(str) {
	return str
		// .replace(/[\u200B-\u200D\uFEFF]/g, ' ')
		.replace(/\u200B/g, '')        // zero-width space
		.replace(/\s?\u200C\s?/g, ' ') // zero-width non-joiner
		.replace(/\u200D/g, '')        // zero-width joiner
		.replace(/\uFEFF/g, '')        // zero-width no-break space
		.replace(/ك/g,'ک')
		.replace(/ي/g,'ی');
}
function gregToShamsi(s) {
  const { jy, jm, jd } = jalaali.toJalaali(+s.slice(0, 4), +s.slice(4, 6), +s.slice(6, 8));
  return (jy*10000) + (jm*100) + jd + '';
}
function shamsiToGreg(s) {
  const { gy, gm, gd } = jalaali.toGregorian(+s.slice(0, 4), +s.slice(4, 6), +s.slice(6, 8));
  return (gy*10000) + (gm*100) + gd + '';
}
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// price helpers
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
function getCell(columnName, instrument, closingPrice, adjustPrices) {
	const y = instrument.YMarNSC;
	const a = adjustPrices;
	const c = columnName;
	
	const str =
		c === 'CompanyCode'    ? instrument.CompanyCode :
		c === 'LatinName'      ? instrument.LatinName :
		c === 'Symbol'         ? instrument.Symbol.replace(' ', '_') :
		c === 'Name'           ? instrument.Name.replace(' ', '_') :
		c === 'Date'           ? closingPrice.DEven :
		c === 'ShamsiDate'     ? gregToShamsi(closingPrice.DEven) :
		c === 'PriceFirst'     ? closingPrice.PriceFirst :
		c === 'PriceMax'       ? closingPrice.PriceMax :
		c === 'PriceMin'       ? closingPrice.PriceMin :
		c === 'LastPrice'      ? closingPrice.PDrCotVal :
		c === 'ClosingPrice'   ? closingPrice.PClosing :
		c === 'Price'          ? closingPrice.QTotCap:
		c === 'Volume'         ? closingPrice.QTotTran5J :
		c === 'Count'          ? closingPrice.ZTotTran :
		c === 'PriceYesterday' ? closingPrice.PriceYesterday : '';
	
	return str;
}
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
const startDeven = '20010321';
const { log, warn } = console;

async function updateInstruments() {
	const lastUpdate = localStorage.getItem('tse.lastInstrumentUpdate');
	let lastDeven;
	let lastId;
	let currentInstruments;
	let currentShares;
	
	if (!lastUpdate) {
		lastDeven = 0;
		lastId = 0;
	} else {
		currentInstruments = parseInstruments();
		currentShares      = parseShares(true);
		const insDevens = Object.keys(currentInstruments).map( k => parseInt(currentInstruments[k].match(/\b\d{8}\b/)[0]) );
		const shareIds = currentShares.map( i => parseInt(i.Idn) );
		lastDeven = Math.max.apply(Math, insDevens);
		lastId    = Math.max.apply(Math, shareIds);
	}
	
	let error;
	const res = await rq.InstrumentAndShare(lastDeven, lastId).catch(err => error = err);
	if (error) { warn('Failed request: InstrumentAndShare'); return; } // TODO: better handling
	
	const splitted  = res.split('@');
	let instruments = splitted[0];
	let shares      = splitted[1];
	
	if (instruments === '*') warn('Cannot update during trading session hours.');
	if (instruments === '')  warn('Already updated: ', 'Instruments');
	if (shares === '')       warn('Already updated: ', 'Shares');
	
	if (instruments !== '' && instruments !== '*') {
		if (currentInstruments && Object.keys(currentInstruments).length) {
			instruments.split(';').forEach(i => currentInstruments[ i.match(/^\d+\b/)[0] ] = i);
			instruments = Object.keys(currentInstruments).map(k => currentInstruments[k]).join(';');
		} else {
			instruments = instruments.replace(/;/g, ';');
		}
		localStorage.setItem('tse.instruments', instruments);
	}
	
	if (shares !== '') {
		if (currentShares && currentShares.length) {
			shares = currentShares.concat( shares.split(';') ).join(';');
		}
		localStorage.setItem('tse.shares', shares);
	}
	
	if ((instruments !== '' && instruments !== '*') || shares !== '') {
		localStorage.setItem('tse.lastInstrumentUpdate', dateToStr(new Date()));
	}
}
async function getLastPossibleDeven() {
	let lastPossibleDeven = localStorage.getItem('tse.lastPossibleDeven');
	const today = new Date();
	if ( !lastPossibleDeven || (+dateToStr(today)-lastPossibleDeven > 1 && ![4,5].includes(today.getDay())) ) {
		const res = await rq.LastPossibleDeven()
		if ( !/^\d{8};\d{8}$/.test(res) ) throw new Error('Invalid server response: LastPossibleDeven');
		lastPossibleDeven = res.split(';')[0] || res.split(';')[1];
		localStorage.setItem('tse.lastPossibleDeven', lastPossibleDeven)
	}
	return +lastPossibleDeven;
}
async function updatePrices(instruments=[]) {
	if (!instruments.length) return;
	const lastPossibleDeven = await getLastPossibleDeven();
	
	const updateNeeded = [];
	let insCodes = [];
	for (const instrument of instruments) {
		const insCode = instrument.InsCode;
		const market = instrument.YMarNSC === 'NO' ? 0 : 1;
		const insData = await localforage.getItem('tse.'+insCode);
		if (!insData) { // doesn't have data
			insCodes.push( [insCode, startDeven, market] );
			updateNeeded.push( {insCode} );
		} else { // has data
			const rows = insData.split(';');
			const lastRow = new ClosingPrice( rows[rows.length-1] );
			const lastRowDEven = +lastRow.DEven;
			if (lastPossibleDeven > lastRowDEven) { // outdated
				insCodes.push( [insCode, lastRowDEven, market] );
				updateNeeded.push( {insCode, oldContent: insData} );
			}
		}
	}
	insCodes = insCodes.map(i => i.join(',')).join(';');
	
	if (insCodes === '') return;
	
	let error;
	const res = await rq.ClosingPrices(insCodes).catch(err => error = err);
	if (error)                       { warn('Failed request: ClosingPrices', error);   return; }
	if ( !/^[\d\.,;@]*$/.test(res) ) { warn('Invalid server response: ClosingPrices'); return; }
	if (res === '')                  { warn('Unknown Error.');                         return; }
	
	const newData = res.split('@');
	const writes = updateNeeded.map((v, i) => {
		const { insCode, oldContent } = v;
		const newContent = newData[i];
		const content = oldContent ? oldContent+';'+newContent : newContent;
		return ['tse.'+insCode, content]
	});
	for (const write of writes) await localforage.setItem(write[0], write[1]);
}

const defaultSettings = {
	columns: [
    [4, 'date'],
    [6, 'open'],
    [7, 'high'],
    [8, 'low'],
    [9, 'last'],
    [10, 'close'],
    [12, 'vol']
  ],
	adjustPrices: 0,
	daysWithoutTrade: false,
	startDate: '20010321'
};
Big.DP = 40
Big.RM = 2;
async function getPrices(symbols=[], settings={}) {
	settings = Object.assign(defaultSettings, settings);
	const instruments = parseInstruments(true, true);
	const selection = instruments.filter(i => symbols.includes(i.Symbol));
	if (!selection.length) return;
	
	await updatePrices(selection);
	
	const prices = {};
	for (const v of selection) {
		const insCode = v.InsCode;
		prices[insCode] = (await localforage.getItem('tse.'+insCode)).split(';').map(i => new ClosingPrice(i));
	}
	const columns = settings.columns.map( i => new Column(!Array.isArray(i) ? [i] : i) );
	
  const shares = localStorage.getItem('tse.shares').split(';').map(i => new Share(i));
	
	const { adjustPrices, startDate, daysWithoutTrade } = settings;
	const res = selection.map(instrument => {
    const insCode = instrument.InsCode;
    const cond = adjustPrices;
    const closingPrices = cond === 1 || cond === 2
			? adjust(cond, prices[insCode], shares, insCode)
			: prices[insCode];
		
    return closingPrices
			.map(closingPrice => {
				if ( Big(closingPrice.DEven).lt(startDate) ) return;
				if ( Big(closingPrice.ZTotTran).eq(0) && !daysWithoutTrade ) return;
				
				return columns
					.map( ({name,header}) => [header || name, getCell(name, instrument, closingPrice, adjustPrices)] )
					.reduce((a,c) => (a[c[0]] = /^[\d\.]+$/.test(c[1]) ? parseFloat(c[1]) : c[1]) && a, {});
			})
			.filter(i=>!!i);
  });
	
	return res;
}

return {
	getPrices, updateInstruments,
	get columnList() {
		return [...Array(15)].map((v,i) => ({name: cols[i], fname: colsFa[i]}))
	}
};
})();