const fs = require('fs');
const { promisify } = require('util');
const sep = require('path').sep;
const Big = require('big.js');
Big.DP = 40
Big.RM = 2;
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const access = promisify(fs.access);

require('./lib/colors');
const _settings = require('./lib/settings');
const getSelectedInstruments = require('./lib/getSelectedInstruments');
const getShares = require('./lib/getShares');
const getColumns = require('./lib/getColumns')();
const getClosingPrices = require('./lib/getClosingPrices');
const util = require('./lib/util');

module.exports = async function (userSettings) {
  const selectedInstruments = await getSelectedInstruments(true);
  if (!selectedInstruments.length) { util.msg('No selected instruments.'); return; }
  
  const defaultSettings = await _settings.get('defaultExport');
  const settings = Object.assign({}, defaultSettings, userSettings);
  const { adjustPrices, delimiter } = settings;
  let { startDate } = settings;
  startDate = util.shamsiToGreg(startDate);
  
  const prices = {};
  for (const v of selectedInstruments) {
    prices[v.InsCode] = await getClosingPrices(v.InsCode);
    if (!prices[v.InsCode].length) { util.msg('Missing instrument data.'); return; }
  }
  const columns = await getColumns();
  
  let headerRow = '';
  if (settings.showHeaders) {
    for (const column of columns) {
      headerRow += column.header ? column.header + ',' : '';
    }
    if (headerRow !== '') {
      headerRow = headerRow.slice(0, -1);
      headerRow += '\n';
    }
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
      if ( Big(closingPrice.DEven).lt(startDate) ) return;
      for (const column of columns) {
        if (!Big(closingPrice.ZTotTran).eq(0) || settings.daysWithoutTrade) {
          str += getCell(column.name, instrument, closingPrice, adjustPrices);
          str += delimiter;
        }
      }
      if (str !== '') {
        str = str.slice(0, -1);
        str += '\n';
      }
    });
    str = str.slice(0, -1);
    return str;
  });
  
  const writes = selectedInstruments.map( (instrument, i) => {
    const filename = getFilename(settings.fileName, instrument, adjustPrices);
    const content = files[i];
    return [filename, content];
  });
  
  let { outDir: dir, fileExtension: ext } = settings;
  await access(dir).catch(err => dir = defaultSettings.outDir);
  dir = dir.endsWith(sep) ? dir : dir+sep;
  ext = ext.startsWith('.') ? ext : '.'+ext;
  const bom = settings.encoding === 'utf8bom' ? '\ufeff' : '';
  for (const write of writes) {
    await writeFile(dir+write[0]+ext, bom+write[1]);
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
  const f = filename;
  
  const str =
    f === 0 ? instrument.CIsin       + suffix(y, a) :
    f === 1 ? instrument.LatinName   + suffix(y, a) :
    f === 2 ? instrument.LatinSymbol + suffix(y, a) :
    f === 3 ? instrument.Name        + suffix(y, a, true) :
    f === 4 ? instrument.Symbol      + suffix(y, a, true) :
    instrument.Symbol + suffix(y, a, true); // instrument.CIsin + suffix(y, a)
  
  return str;
}

function getCell(columnName, instrument, closingPrice, adjustPrices) {
  const y = instrument.YMarNSC;
  const a = adjustPrices;
  const c = columnName;
  
  const str =
    c === 'CompanyCode'    ? instrument.CompanyCode :
    c === 'LatinName'      ? instrument.LatinName + suffix(y, a) :
    c === 'Symbol'         ? instrument.Symbol.replace(' ', '_') + suffix(y, a, true) :
    c === 'Name'           ? instrument.Name.replace(' ', '_') + suffix(y, a, true) :
    c === 'Date'           ? closingPrice.DEven :
    c === 'ShamsiDate'     ? util.gregToShamsi(closingPrice.DEven) :
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
