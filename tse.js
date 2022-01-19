(function () {
const isNode    = (function(){return typeof global!=='undefined'&&this===global})();
const isBrowser = (function(){return typeof window!=='undefined'&&this===window})();
const fetch   = isNode ? require('node-fetch') : isBrowser ? window.fetch   : undefined;
const Big     = isNode ? require('big.js')     : isBrowser ? window.Big     : undefined;
const jalaali = isNode ? require('jalaali-js') : isBrowser ? window.jalaali : undefined;
if (isBrowser) {
  if (!Big)         throw new Error('Cannot find required dependecy: Big');
  if (!localforage) throw new Error('Cannot find required dependecy: localforage');
}
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// storage
const storage = (function () {
  let instance;
  
  if (isNode) {
    const { existsSync, mkdirSync, readFileSync, writeFileSync, statSync, readdirSync } = require('fs');
    const { join } = require('path');
    const { gzipSync, gunzipSync } = require('zlib');
    
    let datadir;
    const home = require('os').homedir();
    const defaultdir = join(home, 'tse-cache');
    const pathfile   = join(home, '.tse');
    if ( existsSync(pathfile) ) {
      datadir = readFileSync(pathfile, 'utf8');
      try { statSync(datadir).isDirectory(); } catch { datadir = defaultdir; }
    } else {
      datadir = defaultdir;
      if ( !existsSync(datadir) ) mkdirSync(datadir, {recursive: true});
      writeFileSync(pathfile, datadir);
    }
    
    const getItem = (key) => {
      key = key.replace('tse.', '');
      const dir = key.startsWith('prices.') ? join(datadir, 'prices') : datadir;
      const file = join(dir, `${key}.csv`);
      if ( !existsSync(file) ) writeFileSync(file, '');
      return readFileSync(file, 'utf8');
    };
    
    const setItem = (key, value) => {
      key = key.replace('tse.', '');
      const dir = key.startsWith('prices.') ? join(datadir, 'prices') : datadir;
      writeFileSync(join(dir, `${key}.csv`), value);
    };
    
    const getItemAsync = (key, zip=false) => new Promise((done, fail) => {
      key = key.replace('tse.', '');
      const dir = key.startsWith('prices.') ? join(datadir, 'prices') : datadir;
      const file = join(dir, `${key}.csv` + (zip?'.gz':''));
      if ( !existsSync(file) ) {
        writeFileSync(file, '');
        done('');
        return;
      }
      const content = readFileSync(file, zip?undefined:'utf8');
      done(zip ? gunzipSync(content).toString() : content);
    });
    
    const setItemAsync = (key, value, zip=false) => new Promise((done, fail) => {
      key = key.replace('tse.', '');
      let dir = datadir;
      if ( key.startsWith('prices.') ) {
        dir = join(datadir, 'prices');
        key = key.replace('prices.', '');
      }
      const file = join(dir, `${key}.csv` + (zip?'.gz':''));
      writeFileSync(file, zip ? gzipSync(value) : value);
      done();
    });
    
    const getItems = async function (selins=new Set(), result={}) {
      const d = join(datadir, 'prices');
      if (!existsSync(d)) mkdirSync(d);
      for (const i of readdirSync(d)) {
        const key = i.replace('.csv','');
        if ( !selins.has(key) ) continue;
        result[key] = readFileSync(join(d,i),'utf8');
      }
    };
    
    const itdGetItems = async function (selins=new Set(), full=false) {
      const d = join(datadir, 'intraday');
      if (!existsSync(d)) mkdirSync(d);
      const dirs = readdirSync(d).filter( i => statSync(join(d,i)).isDirectory() && selins.has(i) );
      let result;
      if (full) { 
        result = dirs.map(i => {
          const files = readdirSync(join(d,i)).map(j => {
            const z = j.slice(-3) === '.gz';
            return [ z ? j.slice(0,-3) : j, readFileSync(join(d,i,j), z ? null : 'utf8') ];
          });
          return [ i, Object.fromEntries(files) ];
        });
      } else {
        result = dirs.map(i => {
          const files = readdirSync(join(d,i)).map(j => {
            const z = j.slice(-3) === '.gz';
            return [z ? j.slice(0,-3) : j, true];
          });
          return [ i, Object.fromEntries(files) ];
        });
      }
      return Object.fromEntries(result);
    };
    const itdSetItem = async function (key, obj) {
      key = key.replace('tse.', '');
      const d = join(datadir, 'intraday');
      const dir = join(d, key);
      if ( !existsSync(dir) ) mkdirSync(dir);
      Object.keys(obj).forEach(k => {
        const cont = obj[k];
        const filename = k + (cont === 'N/A' ? '': '.gz');
        writeFileSync(join(dir, filename), obj[k]);
      });
    };
    
    instance = {
      getItem, setItem, getItemAsync, setItemAsync, getItems,
      get CACHE_DIR() { return datadir; },
      set CACHE_DIR(newdir) {
        if (typeof newdir === 'string') {
          if ( !existsSync(newdir) ) mkdirSync(newdir, {recursive: true});
          if ( statSync(newdir).isDirectory() ) {
            datadir = newdir;
            writeFileSync(pathfile, datadir);
          }
        }
      },
      itd: {
        getItems: itdGetItems,
        setItem: itdSetItem
      }
    };
  } else if (isBrowser) {
    const pako = window.pako || undefined;
    
    const cpstore = localforage.createInstance({name: 'tse.prices'});
    
    const getItemAsync = async (key, zip=false) => {
      let store = localforage;
      if ( key.startsWith('tse.prices.') ) {
        key = key.replace('prices.', '');
        store = cpstore;
      }
      const v = await store.getItem(key);
      if (!v) return '';
      if (!pako) return v;
      return zip ? pako.ungzip(v, {to: 'string'}) : v;
    };
    
    const setItemAsync = async (key, value, zip=false) => {
      let store = localforage;
      if ( key.startsWith('tse.prices.') ) {
        key = key.replace('tse.prices.', '');
        store = cpstore;
      }
      if (!pako) {
        await store.setItem(key, value);
        return;
      }
      const rdy = zip ? pako.gzip(value) : value;
      await store.setItem(key, rdy);
    };
    
    const getItems = async function	(selins=new Set(), result={}) {
      await cpstore.iterate((val, key) => {
        let k = key.replace('tse.', '');
        if (selins.has(k)) result[k] = val;
      });
    };
    
    
    const itdstore = localforage.createInstance({name: 'tse.intraday'});
    
    const itdGetItems = async function (selins=new Set(), full=false) {
      const result = {};
      if (full) {
        await itdstore.iterate((val, key) => {
          if (selins.has(key)) result[key] = val;
        });
      } else {
        await itdstore.iterate((val, key) => {
          if (selins.has(key)) result[key] = Object.keys(val).reduce((r,k) => (r[k] = true, r), {});
        });
      }
      return result;
    };
    const itdSetItem = async (key, value, zip=false) => {
      if (!pako) {
        await itdstore.setItem(key, value);
        return;
      }
      const rdy = zip ? pako.gzip(value) : value;
      await itdstore.setItem(key, rdy);
    };
    
    instance = {
      getItem: (key)        => localStorage.getItem(key) || '',
      setItem: (key, value) => localStorage.setItem(key, value),
      getItemAsync,
      setItemAsync,
      getItems,
      itd: {
        getItems: itdGetItems,
        setItem: itdSetItem
      }
    };
  }
  
  return instance;
})();
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// request
let API_URL = 'http://service.tsetmc.com/tsev2/data/TseClient2.aspx';
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
    const url = new URL(API_URL);
    url.search = new URLSearchParams(params).toString();
    
    return new Promise((resolve, reject) => {
      fetch(url).then(async res => {
        res.status === 200 ? resolve(await res.text()) : reject(res.status +' '+ res.statusText);
      }).catch(err => reject(err));
    });
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
const cols  = ['date','dateshamsi','open','high','low','last','close','vol','count','value','yesterday','symbol','name','namelatin','companycode'];
const colsFa = ['تاریخ میلادی','تاریخ شمسی','اولین قیمت','بیشترین قیمت','کمترین قیمت','آخرین قیمت','قیمت پایانی','حجم معاملات','تعداد معاملات','ارزش معاملات','قیمت پایانی دیروز','نماد','نام','نام لاتین','کد شرکت',];
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
    if ( ![18,19].includes(row.length) ) throw new Error('Invalid Instrument data!');
    // unspecified ones are all string
    this.InsCode      = row[0];   // int64 (long)
    this.InstrumentID = row[1];
    this.LatinSymbol  = row[2];
    this.LatinName    = row[3];
    this.CompanyCode  = row[4];
    this.Symbol       = cleanFa(row[5]).trim();
    this.Name         = row[6];
    this.CIsin        = row[7];
    this.DEven        = row[8];   // int32 (int)
    this.Flow         = row[9];   // 0,1,2,3,4,5,6,7 بازار byte
    this.LSoc30       = row[10];  // نام 30 رقمي فارسي شرکت
    this.CGdSVal      = row[11];  // A,I,O نوع نماد
    this.CGrValCot    = row[12];  // 00,11,1A,...25 کد گروه نماد
    this.YMarNSC      = row[13];  // NO,OL,BK,BY,ID,UI کد بازار
    this.CComVal      = row[14];  // 1,3,4,5,6,7,8,9 کد تابلو
    this.CSecVal      = row[15];  // []62 کد گروه صنعت
    this.CSoSecVal    = row[16];  // []177 کد زير گروه صنعت
    this.YVal         = row[17];  // string نوع نماد
    if (row[18]) {
      this.SymbolOriginal = cleanFa(row[18]).trim();
    }
  }
}
class InstrumentITD {
  constructor(_row='') {
    const row = _row.split(',');
    if (row.length !== 11) throw new Error('Invalid InstrumentITD data!');
    this.InsCode        = row[0];
    this.LVal30         = cleanFa(row[1]); // نام 30 رقمي فارسي نماد
    this.LVal18AFC      = cleanFa(row[2]); // کد 18 رقمي فارسي نماد
    this.FlowTitle      = cleanFa(row[3]);
    this.CGrValCotTitle = cleanFa(row[4]);
    this.Flow           = row[5];
    this.CGrValCot      = row[6];
    this.CIsin          = row[7];
    this.InstrumentID   = row[8];
    this.ZTitad         = row[9];          // تعداد سھام
    this.BaseVol        = row[10];         // حجم مبنا
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
function parseInstruments(struct=false, arr=false, structKey='InsCode', itd=false) {
  let rows = storage.getItem('tse.instruments'+(itd?'.intraday':''));
  rows = rows ? rows.split('\n') : [];
  const instruments = arr ? [] : {};
  const Struct = itd ? InstrumentITD : Instrument;
  for (const row of rows) {
    const item = struct ? new Struct(row) : row;
    if (arr) {
      instruments.push(item);
    } else {
      const key = struct ? item[structKey] : row.split(',', 1)[0];
      instruments[key] = item;
    }
  }
  return instruments;
}
function parseShares(struct=false, arr=true) {
  let rows = storage.getItem('tse.shares');
  rows = rows ? rows.split('\n') : [];
  const shares = arr ? [] : {};
  for (const row of rows) {
    const item = struct ? new Share(row) : row;
    if (arr) {
      shares.push(item);
    } else {
      const key = struct ? item.InsCode : row.split(',', 2)[1];
      if (!shares[key]) shares[key] = [];
      shares[key].push(item);
    }
  }
  return shares;
}
function dateToStr(d) {
  return (d.getFullYear()*10000) + ( (d.getMonth()+1)*100 ) + d.getDate() + '';
}
function strToDate(s) {
  return new Date( +s.slice(0,4), +s.slice(4,6)-1, +s.slice(6,8) );
}
function cleanFa(str) {
  return str
    // .replace(/[\u200B-\u200D\uFEFF]/g, ' ')
    .replace(/\u200B/g, '')        // zero-width space
    .replace(/\s?\u200C\s?/g, ' ') // zero-width non-joiner
    .replace(/\u200D/g, '')        // zero-width joiner
    .replace(/\uFEFF/g, '')        // zero-width no-break space
    .replace(/ك/g, 'ک')
    .replace(/ي/g, 'ی');
}
function gregToShamsi(s) {
  const { jy, jm, jd } = jalaali.toJalaali(+s.slice(0,4), +s.slice(4,6), +s.slice(6,8));
  return (jy*10000) + (jm*100) + jd + '';
}
function shamsiToGreg(s) {
  const { gy, gm, gd } = jalaali.toGregorian(+s.slice(0,4), +s.slice(4,6), +s.slice(6,8));
  return (gy*10000) + (gm*100) + gd + '';
}
function dayDiff(s1, s2) {
  const date1 = +new Date(+s1.slice(0,4), +s1.slice(4,6)-1, +s1.slice(6,8));
  const date2 = +new Date(+s2.slice(0,4), +s2.slice(4,6)-1, +s2.slice(6,8));
  const diffTime = Math.abs(date2 - date1);
  const msPerDay = (1000 * 60 * 60 * 24);
  const diffDays = Math.ceil(diffTime / msPerDay);
  return diffDays;
}
function splitArr(arr, size){
  return arr
    .map( (v, i) => i % size === 0 ? arr.slice(i, i+size) : undefined )
    .filter(i => i);
}
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
let UPDATE_INTERVAL           = 1;
let PRICES_UPDATE_CHUNK       = 50;
let PRICES_UPDATE_CHUNK_DELAY = 300;
let PRICES_UPDATE_RETRY_COUNT = 3;
let PRICES_UPDATE_RETRY_DELAY = 1000;
const SYMBOL_RENAME_STRING    = '-ق';
const MERGED_SYMBOL_CONTENT   = 'merged';
const defaultSettings = {
  columns: [0,2,3,4,5,6,7,8,9],
  adjustPrices: 0,
  daysWithoutTrade: false,
  startDate: '20010321',
  mergeSimilarSymbols: true,
  cache: true,
  csv: false,
  csvHeaders: true,
  csvDelimiter: ',',
  onprogress: undefined,
  progressTotal: 100
};

let lastdevens   = {};
let storedPrices = {};

Big.DP = 40;
Big.RM = 2; // http://mikemcl.github.io/big.js/#rm
function adjust(cond, closingPrices, allShares, inscodes) {
  const shares = new Map(allShares.filter(share => inscodes.has(share.InsCode)).map(i => [i.DEven, i]));
  const cp = closingPrices;
  const len = closingPrices.length;
  const adjustedClosingPrices = [];
  let res = cp;
  if ( (cond === 1 || cond === 2) && len > 1 ) {
    let gaps = new Big('0.0');
    let num = new Big('1.0');
    adjustedClosingPrices.push( cp[len-1] );
    if (cond === 1) {
      for (let i=len-2; i>=0; i-=1) {
        const [curr, next] = [ cp[i], cp[i+1] ];
        if (!Big(curr.PClosing).eq(next.PriceYesterday) && curr.InsCode === next.InsCode) {
          gaps = gaps.plus(1);
        }
      }
    }
    if ( (cond === 1 && gaps.div(len).lt('0.08')) || cond === 2 ) {
      for (let i=len-2; i>=0; i-=1) {
        const [curr, next] = [ cp[i], cp[i+1] ];
        const pricesDontMatch = !Big(curr.PClosing).eq(next.PriceYesterday) && curr.InsCode === next.InsCode;
        const targetShare = shares.get(next.DEven);
        
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
        
        adjustedClosingPrices.push(adjustedClosingPrice);
      }
      
      res = adjustedClosingPrices.reverse();
    }
  }
  return res;
}
function getCell(columnName, instrument, closingPrice) {
  const c = columnName;
  const str =
    c === 'date'        ? closingPrice.DEven :
    c === 'dateshamsi'  ? jalaali && gregToShamsi(closingPrice.DEven) :
    c === 'open'        ? closingPrice.PriceFirst :
    c === 'high'        ? closingPrice.PriceMax :
    c === 'low'         ? closingPrice.PriceMin :
    c === 'last'        ? closingPrice.PDrCotVal :
    c === 'close'       ? closingPrice.PClosing :
    c === 'vol'         ? closingPrice.QTotTran5J :
    c === 'count'       ? closingPrice.ZTotTran :
    c === 'value'       ? closingPrice.QTotCap:
    c === 'yesterday'   ? closingPrice.PriceYesterday :
    c === 'symbol'      ? instrument.Symbol :
    c === 'name'        ? instrument.Name :
    c === 'namelatin'   ? instrument.LatinName :
    c === 'companycode' ? instrument.CompanyCode : '';
  
  return str;
}

function shouldUpdate(deven='', lastPossibleDeven) {
  if (!deven || deven === '0') return true; // first time (never updated before)
  
  const today = new Date();
  const todayDeven = dateToStr(today);
  const daysPassed = dayDiff(lastPossibleDeven, deven);
  const inWeekend = [4,5].includes( today.getDay() );
  const lastUpdateWeekday = strToDate(lastPossibleDeven).getDay();
  
  const result = (
    daysPassed >= UPDATE_INTERVAL &&
    (todayDeven === lastPossibleDeven ? today.getHours() > 16 : true) && // w8 until end of trading session
    !(
      // no update needed if: we are in weekend but ONLY if last time we updated was on last day (wednesday) of THIS week
      inWeekend &&
      lastUpdateWeekday !== 3 && // not wednesday
      daysPassed <= 3            // and wednesday of this week
    )
  );
  
  return result; 
}
async function getLastPossibleDeven() {
  let lastPossibleDeven = storage.getItem('tse.lastPossibleDeven');
  
  if ( !lastPossibleDeven || shouldUpdate(dateToStr(new Date()), lastPossibleDeven) ) {
    let error;
    const res = await rq.LastPossibleDeven().catch(err => error = err);
    if (error)                        return { title: 'Failed request: LastPossibleDeven', detail: error };
    if ( !/^\d{8};\d{8}$/.test(res) ) return { title: 'Invalid server response: LastPossibleDeven' };
    lastPossibleDeven = res.split(';')[0] || res.split(';')[1];
    storage.setItem('tse.lastPossibleDeven', lastPossibleDeven);
  }
  
  return lastPossibleDeven;
}
async function updateInstruments() {
  const lastUpdate = storage.getItem('tse.lastInstrumentUpdate');
  let lastDeven;
  let lastId;
  let currentInstruments;
  let currentShares;
  
  if (!lastUpdate) {
    lastDeven = 0;
    lastId = 0;
  } else {
    currentInstruments = parseInstruments();
    currentShares      = parseShares();
    const insDevens = Object.keys(currentInstruments).map( k => +currentInstruments[k].split(',',9)[8] );
    const shareIds  = currentShares.map(i => +i.split(',',1)[0]);
    lastDeven = Math.max(...insDevens);
    lastId    = Math.max(...shareIds);
  }
  
  const lastPossibleDeven = await getLastPossibleDeven();
  if (typeof lastPossibleDeven === 'object') return lastPossibleDeven;
  
  if ( !shouldUpdate(''+lastDeven, lastPossibleDeven) ) return;
  
  let error;
  const res = await rq.InstrumentAndShare(+dateToStr(new Date()), lastId).catch(err => error = err);
  if (error) return { title: 'Failed request: InstrumentAndShare', detail: error };
  let shares = res.split('@')[1];

  error = 0;
  let instruments = await rq.Instrument(lastDeven).catch(err => error = err);
  if (error) return { title: 'Failed request: Instrument', detail: error };
  
  // if (instruments === '*') console.warn('Cannot update during trading session hours.');
  // if (instruments === '')  console.warn('Already updated: ', 'Instruments');
  // if (shares === '')       console.warn('Already updated: ', 'Shares');
  
  if (instruments !== '' && instruments !== '*') {
    let rows;
    
    if (currentInstruments) {
      let orig = Object.fromEntries(Object.keys(currentInstruments).map(i => (
        i = currentInstruments[i].split(','),
        i.length === 19 && (i[5] = i[18], i.pop()),
        [i[0], i.join(',')]
      )));
      
      instruments.split(';').forEach((v,i)=> (i = v.split(',',1)[0], orig[i] = v));
      
      rows = Object.keys(orig).map(k => orig[k].split(','));
    } else {
      rows = instruments.split(';').map(i=> i.split(','));
    }
    
    let _rows = [...rows.map(i=> (i=[...i], i[5]=cleanFa(i[5]).trim(), i))];
    
    let dups = [...new Set(
      _rows.map(i=> i[5])                      // symbols
        .filter((v,i,a) => a.indexOf(v) !== i) // duplicate symbols (unique)
    )].map(i => _rows.filter(j=> j[5] === i)); // duplicate items
    
    let code_idx = new Map(rows.map((i,j) => [i[0], j]));
    
    for (dup of dups) {
      let dupSorted = dup.sort((a,b) => +b[8] - a[8]);
      
      dupSorted.forEach((i,j) => {
        let oj = code_idx.get(i[0]);
        let origsym = rows[oj][5];
        
        if (j > 0) {
          let postfix = SYMBOL_RENAME_STRING + (j+1);
          i.push(origsym);
          i[5] = origsym + postfix;
        } else {
          i[5] = origsym;
        }
      });
    }
    
    dups.flat().forEach(i => {
      let j = code_idx.get(i[0]);
      rows[j] = i;
    });
    
    instruments = rows;
    code_idx = undefined;
    _rows = undefined;
    rows = undefined;
    
    if (currentInstruments && Object.keys(currentInstruments).length) {
      instruments.forEach(i => currentInstruments[ i[0] ] = i.join(','));
      instruments = Object.keys(currentInstruments).map(k => currentInstruments[k]).join('\n');
    } else {
      instruments = instruments.map(i=>i.join(',')).join('\n');
    }
    storage.setItem('tse.instruments', instruments);
  }
  
  if (shares !== '') {
    if (currentShares && currentShares.length) {
      shares = currentShares.concat( shares.split(';') ).join('\n');
    } else {
      shares = shares.replace(/;/g, '\n');
    }
    storage.setItem('tse.shares', shares);
  }
  
  if ((instruments !== '' && instruments !== '*') || shares !== '') {
    storage.setItem('tse.lastInstrumentUpdate', dateToStr(new Date()));
  }
}

const pricesUpdateManager = (function () {
  let total = 0;
  let succs = [];
  let fails = [];
  let retries = 0;
  let retrychunks = [];
  let timeouts = new Map();
  let qeudRetry;
  let resolve;
  let writing = [];
  let pf, pn, ptot, pSR, pR;
  let shouldCache;
  
  function poll() {
    if (timeouts.size > 0 || qeudRetry) {
      setTimeout(poll, 500);
      return;
    }
    
    if (succs.length === total || retries >= PRICES_UPDATE_RETRY_COUNT) {
      const _succs = [...succs];
      const _fails = [...fails];
      succs = [];
      fails = [];
      Promise.all(writing).then(() => {
        writing = [];
        resolve({succs: _succs, fails: _fails, pn});
      });
      return;
    }
    
    if (retrychunks.length) {
      const inscodes = retrychunks.flat().map(i => i[0]);
      fails = fails.filter(i => inscodes.indexOf(i) === -1);
      retries++;
      qeudRetry = setTimeout(batch, PRICES_UPDATE_RETRY_DELAY, retrychunks);
      retrychunks = [];
      setTimeout(poll, PRICES_UPDATE_RETRY_DELAY);
    }
  }
  
  function onresult(response, chunk, id) {
    const inscodes = chunk.map(([insCode]) => insCode);
    
    if ( typeof response === 'string' && (/^[\d.,;@-]+$/.test(response) || response === '') ) {
      const res = response.replace(/;/g, '\n').split('@').map((v,i)=> [chunk[i][0], v]);
      
      for (const [inscode, newdata] of res) {
        succs.push(inscode);
        
        if (newdata) {
          const olddata = storedPrices[inscode];
          const data = olddata ? olddata+'\n'+newdata : newdata;
          
          storedPrices[inscode] = data;
          lastdevens[inscode] = newdata.split('\n').slice(-1)[0].split(',',2)[1];
          
          writing.push( shouldCache && storage.setItemAsync('tse.prices.'+inscode, data) );
        }
      }
      
      fails = fails.filter(i => inscodes.indexOf(i) === -1);
      
      if (pf) {
        const filled = pSR.div(PRICES_UPDATE_RETRY_COUNT + 2).mul(retries + 1);
        pf(pn= +Big(pn).plus( pSR.sub(filled) ) );
      }
    } else {
      fails.push(...inscodes);
      retrychunks.push(chunk);
    }
    
    timeouts.delete(id);
  }
  
  function request(chunk=[], id) {
    const insCodes = chunk.map(i => i.join(',')).join(';');
    
    rq.ClosingPrices(insCodes)
      .then( r => onresult(r, chunk, id) )
      .catch( () => onresult(undefined, chunk, id) );
    
    if (pf) pf(pn= +Big(pn).plus(pR) );
  }
  
  function batch(chunks=[]) {
    if (qeudRetry) qeudRetry = undefined;
    const ids = chunks.map((v,i) => 'a'+i);
    for (let i=0, delay=0, n=chunks.length; i<n; i++, delay+=PRICES_UPDATE_CHUNK_DELAY) {
      const id = ids[i];
      const t = setTimeout(request, delay, chunks[i], id);
      timeouts.set(id, t);
    }
  }
  
  function start(updateNeeded=[], _shouldCache, po={}) {
    shouldCache = _shouldCache;
    ({ pf, pn, ptot } = po);
    total = updateNeeded.length;
    pSR = ptot.div( Math.ceil(Big(total).div(PRICES_UPDATE_CHUNK)) ); // each successful request:   ( ptot / Math.ceil(total / PRICES_UPDATE_CHUNK) )
    pR = pSR.div(PRICES_UPDATE_RETRY_COUNT + 2);                      // each request:               pSR / (PRICES_UPDATE_RETRY_COUNT + 2)
    succs = [];
    fails = [];
    retries = 0;
    retrychunks = [];
    timeouts = new Map();
    qeudRetry = undefined;
    
    const chunks = splitArr(updateNeeded, PRICES_UPDATE_CHUNK);
    
    batch(chunks);
    
    poll();
    
    return new Promise(r => resolve = r);
  }
  
  return start;
})();
async function updatePrices(selection=[], shouldCache, {pf, pn, ptot}={}) {
  lastdevens = storage.getItem('tse.inscode_lastdeven');
  let inscodes = new Set();
  if (lastdevens) {
    const ents = lastdevens.split('\n').map(i=>i.split(','));
    lastdevens = Object.fromEntries(ents);
    inscodes = new Set( Object.keys(lastdevens) );
  } else {
    lastdevens = {};
  }
  
  let result = { succs: [], fails: [], error: undefined, pn };
  const pfin = +Big(pn).plus(ptot);
  
  const lastPossibleDeven = await getLastPossibleDeven();
  if (typeof lastPossibleDeven === 'object') {
    result.error = lastPossibleDeven;
    if (pf) pf(pn= pfin);
    return result;
  }
  
  const { startDate: firstPossibleDeven } = defaultSettings;
  
  const toUpdate = selection.map(instrument => {
    const inscode = instrument.InsCode;
    const market = instrument.YMarNSC === 'NO' ? 0 : 1;
    
    if ( !inscodes.has(inscode) ) { // doesn't have data
      return [inscode, firstPossibleDeven, market];
    } else { // has data
      const lastdeven = lastdevens[inscode];
      if (!lastdeven) return; // expired symbol
      if ( shouldUpdate(lastdeven, lastPossibleDeven) ) { // but outdated
        return [inscode, lastdeven, market];
      }
    }
  }).filter(i=>i);
  if (pf) pf(pn= +Big(pn).plus( ptot.mul(0.01) ) );
  
  const selins = new Set(selection.map(i => i.InsCode));
  const storedins = new Set(Object.keys(storedPrices));
  if ( !storedins.size || [...selins].find(i => !storedins.has(i)) ) {
    await storage.getItems(selins, storedPrices);
  }
  if (pf) pf(pn= +Big(pn).plus( ptot.mul(0.01) ) );
  
  if (toUpdate.length) {
    const managerResult = await pricesUpdateManager(toUpdate, shouldCache, { pf, pn, ptot: ptot.sub(ptot.mul(0.02)) });
    const { succs, fails } = managerResult;
    ({ pn } = managerResult);
    
    if (succs.length && shouldCache) {
      str = Object.keys(lastdevens).map(k => [k, lastdevens[k]].join(',')).join('\n');
      storage.setItem('tse.inscode_lastdeven', str);
    }
    
    result = { succs, fails };
  }
  
  if (pf && pn !== pfin) pf(pn=pfin);
  
  result.pn = pn;
  
  return result;
}

async function getPrices(symbols=[], _settings={}) {
  if (!symbols.length) return;
  const settings = {...defaultSettings, ..._settings};
  const result = { data: [], error: undefined };
  
  let { onprogress: pf, progressTotal: ptot } = settings;
  if (typeof pf !== 'function') pf = undefined;
  if (typeof ptot !== 'number') ptot = defaultSettings.progressTotal;
  let pn = 0;
  ptot = Big(ptot);
  
  const err = await updateInstruments();
  if (pf) pf(pn= +Big(pn).plus( ptot.mul(0.01) ) );
  if (err) {
    const { title, detail } = err;
    result.error = { code: 1, title, detail };
    if (pf) pf(+ptot);
    return result;
  }
  
  const instruments = parseInstruments(true, undefined, 'Symbol');
  const selection = symbols.map(i => instruments[i]);
  const notFounds = symbols.filter((v,i) => !selection[i]);
  if (pf) pf(pn= +Big(pn).plus( ptot.mul(0.01) ) );
  if (notFounds.length) {
    result.error = { code: 2, title: 'Incorrect Symbol', symbols: notFounds };
    if (pf) pf(+ptot);
    return result;
  }
  
  const { mergeSimilarSymbols } = settings;
  
  let merges = new Map();
  let extrasIndex = -1;
  
  if (mergeSimilarSymbols) {
    const syms = Object.keys(instruments);
    const ins = syms.map(k => instruments[k])
    const roots = new Set(ins.filter(i => i.SymbolOriginal).map(i => i.SymbolOriginal));
    
    merges = new Map([...roots].map(i => [ i, [] ]));
    
    ins.forEach((i, j) => {
      const { SymbolOriginal: orig, Symbol: sym, InsCode: code } = i;
      const renamedOrRoot = orig || sym;
      if (!merges.has(renamedOrRoot)) return;
      const regx = new RegExp(SYMBOL_RENAME_STRING+'(\\d+)');
      merges.get(renamedOrRoot).push({ sym, code, order: orig ? +sym.match(regx)[1] : 1 });
    });
    
    [...merges].forEach(([, v]) => v.sort((a,b) => a.order - b.order));
    
    const extras = selection.map(({Symbol: sym}) =>
      merges.has(sym) &&
      merges.get(sym).slice(1).map(i => instruments[i.sym])
    ).flat().filter(i=>i);
    
    extrasIndex = selection.length;
    selection.push(...extras);
  }
  
  const updateResult = await updatePrices(selection, settings.cache, {pf, pn, ptot: ptot.mul(0.78)});
  const { succs, fails, error } = updateResult;
  ({ pn } = updateResult);
  
  if (error) {
    const { title, detail } = error;
    result.error = { code: 1, title, detail };
    if (pf) pf(+ptot);
    return result;
  }
  
  if (fails.length) {
    const syms = Object.fromEntries( selection.map(i => [i.InsCode, i.Symbol]) );
    result.error = { code: 3, title: 'Incomplete Price Update',
      fails: fails.map(k => syms[k]),
      succs: succs.map(k => syms[k])
    };
    selection.forEach((v,i,a) => fails.includes(v.InsCode) ? a[i] = undefined : 0);
  }
  
  if (mergeSimilarSymbols) selection.splice(extrasIndex);
  
  const columns = settings.columns.map(i => {
    const row = !Array.isArray(i) ? [i] : i;
    const column = new Column(row);
    const finalHeader = column.header || column.name;
    return { ...column, header: finalHeader };
  });
  
  const { adjustPrices, daysWithoutTrade, startDate, csv } = settings;
  const shares = parseShares(true);
  const pi = Big(ptot).mul(0.20).div(selection.length);
  
  const storedPricesMerged = {};
  
  if (mergeSimilarSymbols) {
    for (const [, merge] of [...merges]) {
      const codes = merge.map(i => i.code);
      const [latest] = codes;
      storedPricesMerged[latest] = codes.map(code => storedPrices[code]).reverse().filter(i=>i).join('\n');
    }
  }
  
  const getInstrumentPrices = (instrument) => {
    const { InsCode: inscode, Symbol: sym, SymbolOriginal: symOrig } = instrument;
    
    let prices, inscodes;
    
    if (symOrig) {
      if (mergeSimilarSymbols) return MERGED_SYMBOL_CONTENT;
      prices = storedPrices[inscode];
      inscodes = new Set(inscode);
    } else {
      const isRoot = merges.has(sym);
      prices = isRoot ? storedPricesMerged[inscode] : storedPrices[inscode];
      inscodes = new Set(isRoot ? merges.get(sym).map(i => i.code) : inscode);
    }
    if (!prices) return;
    
    prices = prices.split('\n').map(i => new ClosingPrice(i));
    
    if (adjustPrices === 1 || adjustPrices === 2) {
      prices = adjust(adjustPrices, prices, shares, inscodes);
    }
    
    if (!daysWithoutTrade) {
      prices = prices.filter(i => +i.ZTotTran > 0);
    }
    
    prices = prices.filter(i => +i.DEven > +startDate);
    
    return prices;
  };
  
  if (csv) {
    const { csvHeaders, csvDelimiter } = settings;
    const headers = csvHeaders ? columns.map(i => i.header).join() + '\n' : '';
    
    result.data = selection.map(instrument => {
      if (!instrument) return;
      let res = headers;
      
      const prices = getInstrumentPrices(instrument);
      if (!prices) return res;
      if (prices === MERGED_SYMBOL_CONTENT) return prices;
      
      res += prices
        .map(price => 
          columns.map(i => getCell(i.name, instrument, price)).join(csvDelimiter)
        )
        .join('\n');
      
      if (pf) pf(pn= +Big(pn).plus(pi) );
      return res;
    });
    
  } else {
    const textcols = new Set(['CompanyCode', 'LatinName', 'Symbol', 'Name']);
    
    result.data = selection.map(instrument => {
      if (!instrument) return;
      const res = Object.fromEntries( columns.map(i => [i.header, []]) );
      
      const prices = getInstrumentPrices(instrument);
      if (!prices) return res;
      if (prices === MERGED_SYMBOL_CONTENT) return prices;
      
      for (const price of prices) {
        for (const {header, name} of columns) {
          const cell = getCell(name, instrument, price);
          res[header].push(textcols.has(name) ? cell : parseFloat(cell));
        }
      }
      
      if (pf) pf(pn= +Big(pn).plus(pi) );
      return res;
    });
    
  }
  
  if (pf && pn !== ptot) pf(pn=ptot);
  
  return result;
}

async function getInstruments(struct=true, arr=true, structKey='InsCode') {
  const valids = Object.keys(new Instrument([...Array(18).keys()].join(',')));
  if (valids.indexOf(structKey) === -1) structKey = 'InsCode';
  
  const lastUpdate = storage.getItem('tse.lastInstrumentUpdate');
  const err = await updateInstruments();
  if (err && !lastUpdate) throw err;
  
  return parseInstruments(struct, arr, structKey);
}
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
let INTRADAY_URL = (server='',inscode='',deven='') => `http://${server ? 'cdn'+server+'.' : ''}tsetmc.com/Loader.aspx?ParTree=15131P&i=${inscode}&d=${deven}`;
let INTRADAY_UPDATE_CHUNK_DELAY    = 100;
let INTRADAY_UPDATE_CHUNK_MAX_WAIT = 60000;
let INTRADAY_UPDATE_RETRY_COUNT    = 3;
let INTRADAY_UPDATE_RETRY_DELAY    = 1000;
let INTRADAY_UPDATE_SERVERS        = [0,7,8,9];
const itdDefaultSettings = {
  startDate: '20010321',
  endDate: '',
  cache: true,
  gzip: true,
  reUpdateNoTrades: false,
  updateOnly: false,
  onprogress: undefined,
  progressTotal: 100,
  chunkDelay: INTRADAY_UPDATE_CHUNK_DELAY,
  chunkMaxWait: INTRADAY_UPDATE_CHUNK_MAX_WAIT,
  retryCount: INTRADAY_UPDATE_RETRY_COUNT,
  retryDelay: INTRADAY_UPDATE_RETRY_DELAY,
  servers: INTRADAY_UPDATE_SERVERS
};
const itdGroupCols = [
  [ 'price',  ['time','last','close','open','high','low','count','volume','value','discarded'] ],
  [ 'order',  ['time','row','askcount','askvol','askprice','bidprice','bidvol','bidcount'] ],
  [ 'trade',  ['time','count','volume','price','discarded'] ],
  [ 'client', [
      'pbvol','pbcount','pbval','pbprice','pbvolpot',
      'psvol','pscount','psval','psprice','psvolpot',
      'lbvol','lbcount','lbval','lbprice','lbvolpot',
      'lsvol','lscount','lsval','lsprice','lsvolpot', 'lpchg']
  ],
  [ 'misc',  ['basevol','flow','daymin','daymax','state'] ],
  [ 'shareholder', ['shares','sharespot','change','companycode','companyname'] ]
];

let stored = {};

let zip;
let unzip;
if (isNode) {
  const { gzipSync, gunzipSync } = require('zlib');
  zip   = str => gzipSync(str);
  unzip = buf => gunzipSync(buf).toString();
} else if (isBrowser) {
  const { gzip, ungzip } = window.pako || {};
  zip   = str => gzip(str);
  unzip = buf => ungzip(buf, {to: 'string'});
}

function objify(map, r={}) {
  for (let [k,v] of map) {
    if (Map.prototype.toString.call(v) === '[object Map]' || Array.isArray(v)) {
      r[k] = objify(v, r[k]);
    } else {
      r[k] = v;
    }
  }
  return r;
}
function parseRaw(separator, text) {
  let str = text.split(separator)[1].split('];',1)[0];
  str = '['+ str.replace(/'/g, '"') +']';
  let arr = JSON.parse(str);
  return arr;
}

async function extractAndStore(inscode='', deven_text=[], shouldCache) {
  if (!stored[inscode]) stored[inscode] = {};
  let storedInstrument = stored[inscode];
  
  for (let [deven, text] of deven_text) {
    if (text === 'N/A') {
      storedInstrument[deven] = text;
      continue;
    }
    let ClosingPrice    = parseRaw('var ClosingPriceData=[', text);
    let BestLimit       = parseRaw('var BestLimitData=[', text);
    let IntraTrade      = parseRaw('var IntraTradeData=[', text);
    let ClientType      = parseRaw('var ClientTypeData=[', text);
    let InstrumentState = parseRaw('var InstrumentStateData=[', text);
    let StaticTreshhold = parseRaw('var StaticTreshholdData=[', text);
    let InstSimple      = parseRaw('var InstSimpleData=[', text);
    let ShareHolder     = parseRaw('var ShareHolderData=[', text);
    
    let coli;
    
    coli = [12,2,3,4,6,7,8,9,10,11];
    let price = ClosingPrice.map(row => coli.map(i=> row[i]).join(',') ).join('\n');
    
    coli = [0,1,2,3,4,5,6,7];
    let order = BestLimit.map(row => coli.map(i=> row[i]).join(',') ).join('\n');
    
    coli = [1,0,2,3,4];
    let trade = IntraTrade.map(row => {
      let [h,m,s] = row[1].split(':');
      let timeint = (+h*10000) + (+m*100) + (+s) + '';
      row[1] = timeint;
      return coli.map(i => row[i]);
    }).sort((a,b)=>+a[0]-b[0]).map(i=>i.join(',')).join('\n');
    
    coli = [4,0,12,16,8,6,2,14,18,10,5,1,13,17,9,7,3,15,19,11,20];
    let client = coli.map(i=> ClientType[i]).join(',');
    
    let [a, b] = [InstrumentState, StaticTreshhold];
    let state = a.length && a[0].length ? a[0][2] : '';
    let daymin, daymax;
    if (b.length && b[1].length) { daymin = b[1][2]; daymax = b[1][1]; }
    let [flow, basevol] = [4,9].map(i=>InstSimple[i]);
    let misc = [basevol, flow, daymin, daymax, state].join(',');
    
    coli = [2,3,4,0,5];
    let shareholder = ShareHolder.filter(i=>i[4]).map(row => {
      row[4] = ({ArrowUp:'+', ArrowDown:'-'})[row[4]];
      row[5] = cleanFa(row[5]);
      return coli.map(i => row[i]).join(',');
    }).join('\n');
    
    
    let file = [price, order, trade, client, misc];
    if (shareholder) file.push(shareholder);
    
    storedInstrument[deven] = zip( file.join('\n\n') );
  }
  
  let o = storedInstrument;
  let rdy = Object.keys(o).filter(k => o[k] !== true).reduce((r,k) => (r[k] = o[k], r), {});
  
  if (shouldCache) return storage.itd.setItem(inscode, rdy);
}
const itdUpdateManager = (function () {
  let src = {};
  let total = 0;
  let succs = [];
  let fails = [];
  let retries = 0;
  let retrychunks = [];
  let timeouts = new Map();
  let qeudRetry = -1;
  let resolve;
  let nextsrv = i => (i = servers.indexOf(i)+1, servers[i < servers.length ? i : 0]);
  let writing = [];
  let chunkDelay, chunkMaxWait, retryCount, retryDelay, servers, shouldCache;
  let pf, pn, ptot, pSR, pR;
  let inslastdeven = {};
  let extractedIns = {};
  
  function poll() {
    if (timeouts.size > 0 || qeudRetry) {
      setTimeout(poll, 500);
      return;
    }
    
    if (succs.length === total || retries >= retryCount) {
      let _succs = [ ...succs ];
      let _fails = [ ...fails.map(i => i.slice(1)) ];
      succs = [];
      fails = [];
      if (isBrowser) src = {};
      
      let storedIns = parseInstruments(false, false, undefined, true);
      storedIns = { ...storedIns, ...extractedIns };
      storedIns = Object.keys(storedIns).map(k => storedIns[k]).join('\n');
      storage.setItem('tse.instruments.intraday', storedIns);
      inslastdeven = {};
      extractedIns = {};
      
      Promise.all(writing).then(() => {
        writing = [];
        resolve({succs: _succs, fails: _fails});
      });
      return;
    }
    
    if (retrychunks.length) {
      let joined = retrychunks.map(i => i.join(''));
      fails = fails.filter(i => joined.indexOf(i.join('')) === -1);
      retries++;
      retrychunks.forEach(chunk => chunk[0] = nextsrv(chunk[0]));
      qeudRetry = setTimeout(batch, retryDelay, retrychunks, true);
      retrychunks = [];
      setTimeout(poll, retryDelay);
    }
  }
  
  function onresult(text, chunk, id) {
    if (typeof text === 'string') {
      let res = text;
      if (text !== 'N/A') {
        let t1 = 'var InstSimpleData'      + text.split('var InstSimpleData')[1].split(';')[0] + ';';
        let t2 = 'var StaticTreshholdData' + text.split('var StaticTreshholdData')[1];
        res = t1.replace(/\t/g,'\\t') + t2;
      }
      let _chunk = chunk.slice(1);
      succs.push(_chunk);
      let [inscode, deven] = _chunk;
      
      if (deven === inslastdeven[inscode] && text !== 'N/A') {
        let row = JSON.parse( res.split('var InstSimpleData=')[1].split(';')[0].replace(/'/g,'"') );
        extractedIns[inscode] = [inscode, ...row].join(',');
      }
      
      if (isBrowser) {
        let devens = src[inscode];
        devens[deven] = res;
        
        let alldone = !Object.keys(devens).find(k => !devens[k]);
        if (alldone) {
          let deven_text = Object.keys(devens).map(k => [k, devens[k]]);
          writing.push( extractAndStore(inscode, deven_text, shouldCache) );
        }
      } else {
        writing.push( extractAndStore(inscode, [[deven, res]], shouldCache) );
      }
      
      fails = fails.filter(i => i.join() !== chunk.join());
      
      if (pf) {
        let filled = pSR.div(retryCount + 2).mul(retries + 1);
        pf(pn= +Big(pn).plus( pSR.sub(filled) ) );
      }
    } else {
      fails.push(chunk);
      retrychunks.push(chunk);
    }
    
    timeouts.delete(id);
  }
  
  async function request(chunk=[], id) {
    let [server, inscode, deven] = chunk;
    
    let controller, signal;
    if (typeof AbortController !== 'undefined') {
      controller = new AbortController();
      signal = controller.signal;
    }
    
    fetch(INTRADAY_URL(server, inscode, deven), signal ? {signal} : undefined)
      .then(async res => {
        let { status } = res;
        
        if (status === 200) {
          let text = await res.text();
          if (text.includes('Object moved to <a href="/GeneralError.aspx?aspxerrorpath=/Loader.aspx">here</a>')) {
            onresult('N/A', chunk, id);
          } else {
            let _text = text.split(`var StaticTreshholdData`)[1];
            let isPageUpToDate = [
              'ClosingPrice', 'IntraDayPrice', 'IntraTrade', 'ClientType', 'BestLimit'
            ].some(i => _text.split(`var ${i}Data=[`)[1].split('];')[0]);
            
            if (isPageUpToDate) {
              onresult(text, chunk, id);
            } else {
              onresult(undefined, chunk, id);
            }
          }
        } else {
          onresult(undefined, chunk, id);
        }
      })
      .catch(() => onresult(undefined, chunk, id));
    
    if (controller) setTimeout(() => controller.abort(), chunkMaxWait);
    
    if (pf) pf(pn= +Big(pn).plus(pR) );
  }
  
  function batch(chunks=[]) {
    if (qeudRetry) qeudRetry = undefined;
    let ids = chunks.map((v,i) => 'a'+i);
    for (let i=0, delay=0, n=chunks.length; i<n; i++, delay+=chunkDelay) {
      let id = ids[i];
      let t = setTimeout(request, delay, chunks[i], id);
      timeouts.set(id, t);
    }
  }
  
  async function start(inscode_devens, opts, po) {
    ({ chunkDelay, chunkMaxWait, retryCount, retryDelay, servers, shouldCache } = opts);
    ({ pf, pn, ptot } = po);
    if (isBrowser) src = objify( inscode_devens.map(([a,b]) => [ a, b.map(i=>[i,undefined]) ]) );
    let chunks = [...inscode_devens].reduce((r,[inscode,devens]) => r=[...r, ...(devens ? devens.map(i=>[servers[0],inscode,''+i]) : []) ], []);
    total = chunks.length;
    pSR = ptot.div(total);        // each successful request:   ptot / total
    pR = pSR.div(retryCount + 2); // each request:              pSR / (retryCount + 2)
    succs = [];
    fails = [];
    retries = 0;
    retrychunks = [];
    timeouts = new Map();
    qeudRetry = undefined;
    writing = [];
    inslastdeven = objify( inscode_devens.map(([a,b])=> [a, ''+b[b.length-1]]) );
    extractedIns = {};
    
    batch(chunks);
    
    poll();
    
    return new Promise(r => resolve = r);
  }
  
  return start;
})();

async function getIntraday(symbols=[], _settings={}) {
  if (!symbols.length) return;
  const settings = {...itdDefaultSettings, ..._settings};
  const result = { data: [], error: undefined };
  
  let { onprogress: pf, progressTotal: ptot } = settings;
  if (typeof pf !== 'function') pf = undefined;
  if (typeof ptot !== 'number') ptot = itdDefaultSettings.progressTotal;
  let pn = 0;
  ptot = Big(ptot);
  
  const err = await updateInstruments();
  if (pf) pf(pn= +Big(pn).plus( ptot.mul(0.01) ) );
  if (err) {
    const { title, detail } = err;
    result.error = { code: 1, title, detail };
    if (pf) pf(+ptot);
    return result;
  }
  
  const instruments = parseInstruments(true, undefined, 'Symbol');
  const selection = symbols.map(i => instruments[i]);
  const notFounds = symbols.filter((v,i) => !selection[i]);
  if (pf) pf(pn= +Big(pn).plus( ptot.mul(0.01) ) );
  if (notFounds.length) {
    result.error = { code: 2, title: 'Incorrect Symbol', symbols: notFounds };
    if (pf) pf(+ptot);
    return result;
  }
  
  const selins = new Set(selection.map(i => i && i.InsCode));
  
  let storedInscodeDevens = await storage.getItemAsync('tse.inscode_devens');
  storedInscodeDevens = storedInscodeDevens ? storedInscodeDevens.split('\n').map(i=>i.split(';')).map(([i,d]) => [i,d.split(',').map(i=>+i)]): [];
  const storedInscodes = new Set(storedInscodeDevens.map(i => i[0]));
  const storedLastdevens = [...new Set(storedInscodeDevens.map(([,d])=> d[d.length-1]))];
  
  const endDate = +settings.endDate;
  const _endDate = endDate || +dateToStr(new Date());
  const { cache } = settings;
  
  if ( !storedInscodeDevens.length || [...selins].some(i => !storedInscodes.has(i)) || storedLastdevens.some(i => i < _endDate) ) {
    const upres = await updatePrices(selection, cache, {pf, pn, ptot: ptot.mul(0.10)});
    const { succs, fails, error } = upres;
    ({ pn } = upres);
    
    if (error) {
      const { title, detail } = error;
      result.error = { code: 1, title, detail };
      if (pf) pf(+ptot);
      return result;
    }
    
    if (fails.length) {
      const syms = Object.fromEntries( selection.map(i => [i.InsCode, i.Symbol]) );
      result.error = { code: 3, title: 'Incomplete Price Update',
        fails: fails.map(k => syms[k]),
        succs: succs.map(k => syms[k])
      };
      selection.forEach((v,i,a) => fails.includes(v.InsCode) ? a[i] = undefined : 0);
    }
    
    storedInscodeDevens = Object.keys(storedPrices).map(inscode => {
      const prices = storedPrices[inscode];
      if (!prices) return;
      const devens = prices
        .split('\n')
        .filter(i => +i.split(',',5)[4] > 0) // count > 0
        .map(i => +i.split(',',2)[1]);       // deven
      return [inscode, devens];
    }).filter(i=>i);
    
    if (cache) {
      const str = storedInscodeDevens.map(([i,d]) => [i, d.join(',')].join(';') ).join('\n');
      await storage.setItemAsync('tse.inscode_devens', str);
    }
  }
  storedInscodeDevens = Object.fromEntries(storedInscodeDevens);
  if (pf) pf(pn= +Big(pn).plus( ptot.mul(0.01) ) );
  
  /** note:  ↓... let == const (mostly) */
  
  let startDate = +settings.startDate;
  
  let isInRange = endDate
    ? i => i >= startDate && i <= endDate
    : i => i >= startDate;
  
  let askedInscodeDevens = [...selins].map(inscode => {
    if (!inscode) return [];
    let allDevens = storedInscodeDevens[inscode];
    if (!allDevens) return [inscode, []];
    let askedDevens = allDevens.filter(isInRange);
    return [inscode, askedDevens];
  });
  
  let { reUpdateNoTrades, updateOnly } = settings;
  stored = await storage.itd.getItems(selins, updateOnly ? reUpdateNoTrades : true);
  
  let toUpdate = askedInscodeDevens.map(([inscode, devens]) => {
    if (!inscode || !devens.length) return;
    if (!stored[inscode]) return [inscode, devens];
    let needupdate = reUpdateNoTrades
      ? devens.filter(deven => {
        let d = stored[inscode][deven];
        if (!d) return true;
        let [,,trade] = unzip(d).split('\n\n');
        if (!trade) return true;
        return false;
      })
      : devens.filter(deven => !stored[inscode][deven]);
    if (needupdate.length) return [inscode, needupdate];
  }).filter(i=>i);
  if (pf) pf(pn= +Big(pn).plus( ptot.mul(0.01) ) );
  
  let { chunkDelay, chunkMaxWait, retryCount, retryDelay, servers } = settings;
  if (!Array.isArray(servers) || servers.some(i => !Number.isInteger(i) || i < 0)) servers = itdDefaultSettings.servers;
  
  if (toUpdate.length > 0) {
    let { succs, fails } = await itdUpdateManager(toUpdate, {shouldCache: cache, chunkDelay, chunkMaxWait, retryCount, retryDelay, servers}, {pf, pn, ptot: ptot.mul(0.85)});
    
    if (fails.length) {
      let k = Object.fromEntries( selection.map(i => [i.InsCode, i.Symbol]) );
      let reducer = (o,[i,d]) => (!o[k[i]] && (o[k[i]]=[]), o[k[i]].push(d), o);
      result.error = { code: 4, title: 'Incomplete Intraday Update',
        fails: fails.reduce(reducer, {}),
        succs: succs.reduce(reducer, {})
      };
    }
  }
  if (pf) pf(pn= +ptot.mul(0.99) );
  
  if (!updateOnly) {
    let { gzip } = settings;
    
    result.data = askedInscodeDevens.map(([inscode, devens]) => {
      let instr = stored[inscode];
      if (!instr) return;
      if (gzip) {
        return devens.map(deven => [ deven, instr[deven] ]);
      } else {
        return devens.map(deven => [ deven, !instr[deven] || typeof instr[deven] === 'string' ? instr[deven] : unzip(instr[deven]) ]);
      }
    });
  }
  if (pf) pf(+ptot);
  
  return result;
}

async function getIntradayInstruments(struct=true, arr=true, structKey='InsCode') {
  const valids = Object.keys(new InstrumentITD([...Array(11).keys()].join(',')));
  if (valids.indexOf(structKey) === -1) structKey = 'InsCode';
  return parseInstruments(struct, arr, structKey, true);
}
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
const instance = {
  getPrices,
  getInstruments,
  
  get API_URL() { return API_URL; },
  set API_URL(v) {
    if (typeof v !== 'string') return;
    let bad;
    try { new URL(v); } catch (e) { bad = true; throw e; }
    if (!bad) API_URL = v;
  },
  
  get UPDATE_INTERVAL() { return UPDATE_INTERVAL; },
  set UPDATE_INTERVAL(v) { if (Number.isInteger(v)) UPDATE_INTERVAL = v; },
  
  get PRICES_UPDATE_CHUNK() { return PRICES_UPDATE_CHUNK; },
  set PRICES_UPDATE_CHUNK(v) { if (Number.isInteger(v) && v > 0 && v < 60) PRICES_UPDATE_CHUNK = v; },
  
  get PRICES_UPDATE_CHUNK_DELAY() { return PRICES_UPDATE_CHUNK_DELAY; },
  set PRICES_UPDATE_CHUNK_DELAY(v) { if (Number.isInteger(v)) PRICES_UPDATE_CHUNK_DELAY = v; },
  
  get PRICES_UPDATE_RETRY_COUNT() { return PRICES_UPDATE_RETRY_COUNT; },
  set PRICES_UPDATE_RETRY_COUNT(v) { if (Number.isInteger(v)) PRICES_UPDATE_RETRY_COUNT = v; },
  
  get PRICES_UPDATE_RETRY_DELAY() { return PRICES_UPDATE_RETRY_DELAY; },
  set PRICES_UPDATE_RETRY_DELAY(v) { if (Number.isInteger(v)) PRICES_UPDATE_RETRY_DELAY = v; },
  
  get columnList() {
    return [...Array(15)].map((v,i) => ({name: cols[i], fname: colsFa[i]}));
  },
  
  getIntraday,
  getIntradayInstruments,
  
  get INTRADAY_URL() { return INTRADAY_URL; },
  set INTRADAY_URL(v) {
    if (typeof v !== 'function') return;
    let bad;
    try { new URL(v()); } catch (e) { bad = true; throw e; }
    if (!bad) INTRADAY_URL = v;
  },
  
  get INTRADAY_UPDATE_CHUNK_DELAY() { return INTRADAY_UPDATE_CHUNK_DELAY; },
  set INTRADAY_UPDATE_CHUNK_DELAY(v) { if (Number.isInteger(v)) INTRADAY_UPDATE_CHUNK_DELAY = v; },
  
  get INTRADAY_UPDATE_CHUNK_MAX_WAIT() { return INTRADAY_UPDATE_CHUNK_MAX_WAIT; },
  set INTRADAY_UPDATE_CHUNK_MAX_WAIT(v) { if (Number.isInteger(v)) INTRADAY_UPDATE_CHUNK_MAX_WAIT = v; },
  
  get INTRADAY_UPDATE_RETRY_COUNT() { return INTRADAY_UPDATE_RETRY_COUNT; },
  set INTRADAY_UPDATE_RETRY_COUNT(v) { if (Number.isInteger(v)) INTRADAY_UPDATE_RETRY_COUNT = v; },
  
  get INTRADAY_UPDATE_RETRY_DELAY() { return INTRADAY_UPDATE_RETRY_DELAY; },
  set INTRADAY_UPDATE_RETRY_DELAY(v) { if (Number.isInteger(v)) INTRADAY_UPDATE_RETRY_DELAY = v; },
  
  get INTRADAY_UPDATE_SERVERS() { return INTRADAY_UPDATE_SERVERS; },
  set INTRADAY_UPDATE_SERVERS(v) { if (Array.isArray(v) && !v.some(i => !Number.isInteger(i) || i < 0)) INTRADAY_UPDATE_SERVERS = v; },
  
  itdGroupCols
};
if (isNode) {
  Object.defineProperty(instance, 'CACHE_DIR', {
    get: () => storage.CACHE_DIR,
    set: v => storage.CACHE_DIR = v
  });
  module.exports = instance;
} else if (isBrowser) {
  window.tse = instance;
}
})();