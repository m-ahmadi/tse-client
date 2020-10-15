#!/usr/bin/env node
const tse = require('./tse.js');
if (require.main !== module) {
  module.exports = tse;
  return;
}
const cmd = require('commander');
const { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } = require('fs');
const { join, resolve } = require('path');
const { toGregorian } = require('jalaali-js');
require('./lib/colors.js');

if ( !existsSync(join(__dirname,'settings.json')) ) resetDefaults();
const settings = require('./settings.json');
const { log } = console;

cmd
  .helpOption('-h, --help', 'Show help.')
  .name('tse')
  .usage('[symbols] [options]\n  tse faSymbol1 faSymbol2 -o /tsedata -x txt -e utf8 -H')
  .description('A client for receiving stock data from the Tehran Stock Exchange (TSE).')
  .option('-s, --symbol <string>',           '"faSymbol faSymbol ..."')
  .option('-f, --symbol-file <string>',      'path/to/file "faSymbol \\n fasymbol ..."')
  .option('-m, --symbol-filter <string>',    '"m=id,id... t=id,id... i=id,id..."')
  .option('-d, --symbol-delete',             'true/false', false)
  .option('-a, --symbol-all',                'true/false', false)
  .option('-c, --price-columns <string>',    '1,2 | 1:a 2:b', '4:DATE 6:OPEN 7:HIGH 8:LOW 9:LAST 10:CLOSE 12:VOL')
  .option('-j, --price-adjust <number>',     '0|1|2 as none|capinc + dividend|capinc', 0)
  .option('-b, --price-start-date <string>', 'Shamsi YYYYMMDD min: 13800101 as ^\\d{8}$ or Relative as ^\\d+(y|m|d)$', '3m') // 13800101
  .option('-t, --price-days-without-trade',  'true/false', false)
  .option('-o, --file-outdir <string>',      '', './')
  .option('-n, --file-name <number>',        '0|1|2|3|4 as isin_code|latin_name|latin_symbol|farsi_name|farsi_symbol', '4')
  .option('-x, --file-extension <string>',   '', 'csv')
  .option('-l, --file-delimiter <string>',   '', ',')
  .option('-e, --file-encoding <string>',    'utf8|utf8bom|ascii', 'utf8bom')
  .option('-H, --file-no-headers',           'true/false', false)
  .option('--save',                          'true/false', false)
  .option('--save-reset',                    'true/false', false)
  .option('--cache-dir [path]',              'Show or change the location of cacheDir.\n\t\t\t\t\t  if [path] is provided, new location is set and\n\t\t\t\t\t  existing content is moved to the new location.')
  .version(''+JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8')).version, '-v, --version', 'Show version number.')
cmd.command('list').alias('ls').description('Show information about current settings and more. (help: tse ls -h)')
  .option('-S, --saved-symbols',             'List saved symbols.')
  .option('-D, --saved-settings',            'List saved settings.')
  .option('-L, --last-update',               'Show the date of last instruments update.')
  .option('-F, --filter-match <string>',     'List symbols that match a filter string. (same string syntax as: tse s -f)')
  .option('-A, --all-columns',               'Show all possible column indexes.')
  .option('-M, --id-market',                 'Show all possible market-type IDs. "Instrument.Flow"')
  .option('-T, --id-symbol',                 'Show all possible symbol-type IDs. "Instrument.YVal"')
  .option('-I, --id-industry',               'Show all possible industry-sector IDs. "Instrument.CSecVal"')
  .option('-B, --id-board',                  'Show all possible board IDs. "Instrument.CComVal"')
  .option('-Y, --id-market-code',            'Show all possible market-code IDs. "Instrument.YMarNSC"')
  .option('-G, --id-symbol-gcode',           'Show all possible symbol-group IDs. "Instrument.CGrValCot"')
  .option('-O, --id-sort [columnIndex]',     'Sort the IDs table by specifying the index of the column. put underline at end for ascending sort: 1_', 1)
  .option('--search <query>',                'Search symbols.')
  .action(list);
cmd.parse(process.argv);

const subs = new Set( cmd.commands.map(i=>[i.name(),i.alias()]).reduce((a,c)=>a=a.concat(c),[]) );
if (cmd.rawArgs.find(i=> subs.has(i))) return;
if (cmd.cacheDir) { handleCacheDir(cmd.cacheDir); return; }

(async function () {
const instruments = await tse.getInstruments();
const allSymbols = instruments.map(i => i.Symbol);
const symbols = resolveSymbols(allSymbols, settings.symbols, cmd);

log('Total symbols:'.grey, (symbols.length+'').yellow );

if (symbols.length) {
  const { priceColumns, priceStartDate, priceDaysWithoutTrade } = cmd;
  let { priceAdjust } = cmd;
  priceAdjust = +priceAdjust;

  let priceStartDateParsed;
  if (priceStartDate) {
    const s = priceStartDate;
    const mindate = 20010321;
    const relative = s.match(/^(\d{1,3})(y|m|d)$/);
    if (relative) {
      const n = parseInt(relative[1], 10);
      const m = ({y:'FullYear',m:'Month',d:'Date'})[ relative[2] ];
      const d = new Date();
      d['set'+m](d['get'+m]() - n);
      const res = (d.getFullYear()*10000) + ((d.getMonth()+1)*100) + d.getDate();
      priceStartDateParsed = res < mindate ? ''+mindate : ''+res;
    } else if (/^\d{8}$/.test(s)) {
      const {gy,gm,gd} = toGregorian(+s.slice(0,4), +s.slice(4,6), +s.slice(6,8));
      const res = (gy*10000) + (gm*100) + gd;
      priceStartDateParsed = res < mindate ? ''+mindate : ''+res;
    } else {
      abort('Invalid option:', '--price-start-date');
      return;
    }
  }
  
  let priceColumnsParsed;
  if (priceColumns) {
    priceColumnsParsed = parseColstr(priceColumns);
    if (!priceColumnsParsed) abort('Invalid option:', '--price-columns');
  }
  
  if ( !/^[0-2]$/.test(''+priceAdjust) ) { abort('Invalid option:', '--price-adjust', '\n\tPattern not matched:'.red, '^[0-2]$'); return; }
  
  const _settings = {
    columns:          priceColumnsParsed,
    adjustPrices:     priceAdjust,
    daysWithoutTrade: priceDaysWithoutTrade,
    startDate:        priceStartDateParsed
  };
  const { error, prices } = await tse.getPrices(symbols, _settings);
  
  if (error) {
    const { code, title } = error;
    const fatal = ('Fatal Error #'+code+':').red +'  '+ title.red +'\n\n';
    
    if (code === 1) {
      const { detail } = error;
      const msg = typeof detail === 'object' ? detail.message : detail;
      log(fatal + msg.red);
    } else if (code === 2) {
      const { symbols } = error;
      log(fatal + symbols.join('\n').red);
    } else if (code === 3) {
      const { fails, succs } = error;
      const msg = ''
        + ('\n'+title+':').redBold + '\n\t'
        + ('X fail: '+fails.length).red + '\n\t'
        + ('√ done: '+succs.length).green;
      log(msg);
    }
    process.exitCode = 1;
    return;
  }
  
  const { fileDelimiter, fileNoHeaders: fileHeaders } = cmd;
  
  if ( !/^.$/.test(fileDelimiter) ) { abort('Invalid option:', '--file-delimiter', '\n\tPattern not matched:'.red, '^.$'); return; }
  
  const files = [];
  const headers = priceColumnsParsed.map(i=>i[1]);
  const headerRow = headers.join(fileDelimiter) + '\n';
  for (let i=0, n=prices.length; i<n; i++) {
    const sym = prices[i];
    const fcol = sym[ headers[0] ];
    let file = fileHeaders ? headerRow : '';
    for (let j=0, m=fcol.length; j<m; j++) {
      for (const k of headers) {
        file += sym[k][j] + fileDelimiter;
      }
      file = file.slice(0,-1);
      file += '\n';
    }
    files.push(file);
  }
  
  const { fileOutdir, fileExtension } = cmd;
  let { fileName, fileEncoding } = cmd;
  fileName = +fileName;
  
//if (!existsSync(fileOutdir))                      { abort('Invalid option:', '--file-outdir',    '\n\tDirectory doesn\'t exist:'.red, resolve(fileOutdir).grey); return; }
  if ( !existsSync(fileOutdir) ) mkdirSync(fileOutdir);
  if ( !statSync(fileOutdir).isDirectory() )        { abort('Invalid option:', '--file-outdir',    '\n\tPath is not a directory:'.red,  resolve(fileOutdir).grey); return; }
  if ( !/^[0-4]$/.test(''+fileName) )               { abort('Invalid option:', '--file-name',      '\n\tPattern not matched:'.red, '^[0-4]$');                     return; }
  if ( !/^.{1,11}$/.test(''+fileExtension) )        { abort('Invalid option:', '--file-name',      '\n\tPattern not matched:'.red, '^.{1,11}$');                   return; }
  if ( !/^(utf8(bom)?|ascii)$/.test(fileEncoding) ) { abort('Invalid option:', '--file-encoding',  '\n\tPattern not matched:'.red, '^(utf8(bom)?|ascii)$');        return; }
  
  const symins = await tse.getInstruments(true, false, 'Symbol');
  let bom = '';
  if (fileEncoding === 'utf8bom') {
    bom = '\ufeff';
    fileEncoding = undefined;
  }
  
  files.forEach((file, i) => {
    const sym = symbols[i];
    const instrument = symins[sym];
    const name = getFilename(fileName, instrument, priceAdjust);
    writeFileSync(join(fileOutdir, name+'.'+fileExtension), bom+file, fileEncoding);
  });
  
  const { save, saveReset } = cmd;
  if (save) {
    const opts = {
      symbols,
      priceColumns,
      priceAdjust,
      priceStartDate,
      priceDaysWithoutTrade,
      fileOutdir,
      fileName,
      fileExtension,
      fileDelimiter,
      fileEncoding,
      fileHeaders,
    };
    writeFileSync(join(__dirname,'settings.json'), JSON.stringify(opts,null,2));
  }
  
  if (saveReset) resetDefaults();
} else {
  abort('No symbols to process.', '');
  return;
}

})();
function resolveSymbols(allSymbols, savedSymbols, { args, symbol, symbolFile, symbolFilter, symbolDelete, symbolAll }) {
  if (symbolAll) return symbolDelete ? [] : allSymbols;
  
  let symbols = [...args];

  if (symbol) {
    const syms = symbol.split(' ');
    symbols.push(...syms);
  }

  if (symbolFile) {
    try {
      const syms = readFileSync(symbolsFile, 'utf8').replace(/\ufeff/,'').replace(/\r\n/g, '\n').split('\n');
      symbols.push(...syms);
    } catch (e) {
      log(e.message.red);
    }
  }
  
  if (symbolFilter) {
    const filters = parseFilterStr(symbolFilter);
    if (filters) {
      const { flow, yval, csecval } = filters;
      const syms = instruments.filter(i => (
        (flow && flow.includes(i.Flow)) &&
        (yval && yval.includes(i.YVal)) &&
        (csecval && csecval.includes(i.CSecVal))
      )).map(i => i.Symbol);
      symbols.push(...syms);
    } else {
      log('Invalid filter string.'.redBold);
    }
  }
  
  if (symbolDelete) {
    symbols = savedSymbols.filter(i => symbols.indexOf(i) === -1);
  } else {
    symbols = [...new Set([...savedSymbols, ...symbols])];
  }
  
  const finalSymbols = symbols.filter(symbol => {
    if (allSymbols.indexOf(symbol) !== -1) {
      return true;
    } else {
      log('No such symbol:'.redBold, symbol.whiteBold);
      return false;
    }
  });
  
  return finalSymbols;
}
function handleCacheDir(newdir) {
  if (typeof newdir === 'string') {
    tse.CACHE_DIR = newdir;
    if (tse.CACHE_DIR !== newdir) log('Invalid option:'.redBold, '--cache-dir'.whiteBold, '\n\tDirectory path is an existing file.'.red);
  }
  log(tse.CACHE_DIR);
}

// helpers
function parseFilterStr(str='') {
  const map = {m:'flow', t:'yval', i:'csecval'};
  
  const arr = str.split(' ');
  const result = {};
  
  for (const i of arr) {
    if (i.indexOf('=') === -1) continue;
    
    const [key, val] = i.split('=');
    
    if ( !map[key] )               continue;
    if ( !/^[\d\w,]+$/.test(val) ) continue;
    
    result[ map[key] ] = val.split(',')
  }
  
  return Object.keys(result).length === arr.length ? result : undefined;
}
function parseColstr(str='') {
  if (!str) return;
  const chr = str.indexOf(' ') !== -1 ? ' ' : ',';
  const res = str.split(chr).map(i => {
    if (!/^\d{1,2}$|^\d{1,2}:\w+$/.test(i)) return;
    const row = i.indexOf(':') !== -1
      ? [  +i.split(':')[0],  i.split(':')[1]  ]
      : [  +i  ];
    if (Number.isNaN(row[0]) || row[0] === undefined) return;
    return row;
  });
  return res.filter(i=>!i).length ? undefined : res;
}
function abort(m1, m2, ...rest) {
  console.log(m1.redBold, m2.whiteBold, ...rest);
  process.exitCode = 1;
  console.log('\naborted'.red);
}
function suffix(YMarNSC, adjust, fa=false) {
  let str = '';
  if (YMarNSC !== 'ID') {
    if (adjust === 1) {
      str = fa ? '-ت' : '-a';
    } else if (adjust === 2) {
      str = fa ? '-ا' : '-i';
    }
  }
  return str;
}
function getFilename(filename, instrument, adjust) {
  const y = instrument.YMarNSC;
  const a = adjust;
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
function resetDefaults() {
  writeFileSync(join(__dirname,'settings.json'), JSON.stringify({
    symbols:               [],
    priceColumns:          '4:DATE 6:OPEN 7:HIGH 8:LOW 9:LAST 10:CLOSE 12:VOL',
    priceAdjust:           0,
    priceStartDate:        '3m',
    priceDaysWithoutTrade: false,
    fileOutdir:            './',
    fileName:              4,
    fileExtension:         'csv',
    fileDelimiter:         ',',
    fileHeaders:           true
  }, null, 2));
}
function printTable(table=[], cols=[]) {
  if (!table.length) return '';
  const colors = ['yellow', 'cyan', 'green', 'green'];
  
  const maxlen = Array(table[0].length).fill(0);
  
  
  for (const row of table) {
    row.forEach((cell, i, a) => {
      const _cell = cell.toString();
      a[i] = _cell;
      if (_cell.length > maxlen[i]) maxlen[i] = _cell.length;
    });
  }
  const total = maxlen.reduce((a,c)=>a+=c, 0);
  

  const line = '='.repeat( total + (cols.length>3?17:13) ) + '\n';
  
  let s = '';
  
  
  s += line;

  cols.forEach((name, i) => {
    const n = Math.abs(maxlen[i] - name.length);
    s += ` ${name.yellowBold} ${' '.repeat(n)}  `;
    
  });
  s += '\n';
  s += line;
  
  for (const row of table) {
    s += '│';
    row.forEach((cell, i) => {
      const n = Math.abs(maxlen[i] - cell.length);
      // s += ' '+  cell.green +' '.repeat(n) + ' │';
      const c = colors[i];
      s += ` ${cell[c]} ${' '.repeat(n)} │`;
    });
    s +=  '\n';
  }
  
  s += line;
  
  console.log(s);
}

async function list(opts) {
  const { savedSymbols, savedSettings, allColumns, lastUpdate, filterMatch, search } = opts;
  const { table } = console;
  
  if (savedSymbols) {
    const selins = settings.symbols.join('\n');
    log('\nSaved symbols:'.yellow);
    table( selins.length ? selins.yellowBold : 'none'.yellow );
  }
  
  if (savedSettings) {
    log('\nSaved settings:'.yellow);
    const t = {...settings};
    delete t.symbols;
    const o = {};
    Object.keys(t).forEach(k => o[ '--'+k.replace(/([A-Z])/g, '-$1').toLowerCase() ] = t[k]);
    table(o);
    // const a = Object.keys(t).reduce((a,k)=> (a.push(['--'+k.replace(/([A-Z])/g, '-$1').toLowerCase(), t[k]]), a), []);
    // printTable(a);
  }
  
  if (allColumns) {
    log('\nAll valid column indexes:'.yellow);
    table(tse.columnList);
  }
  
  if (filterMatch) {
    const filters = parseFilterStr(filterMatch);
    
    if (filters) {
      const ins = await tse.getInstruments(true, true);
      const { flow, yval, csecval } = filters;
      const matchedSymbols = ins.filter(i => (
        (flow && flow.includes(i.Flow)) ||
        (yval && yval.includes(i.YVal)) ||
        (csecval && csecval.includes(i.CSecVal))
      )).map(i => i.Symbol);
      
      log(matchedSymbols.sort().join('\n'));
    } else {
      log('Invalid filter string.'.redBold);
    }
  }
  
  if (search) {
    const str = search;
    if (str.length > 1) {
      const ins = await tse.getInstruments(true, true);
      const res = ins
        .filter(i => i.Symbol.includes(str) || i.Name.includes(str))
        .map(i => `${i.Symbol.yellowBold} (${i.Name.grey})`)
        .sort()
        .join('\n');
      log(res ? res : 'No match for: '.redBold + str.whiteBold);
    } else {
      log('At least 2 characters'.redBold);
    }
  }
  
  const { idMarket, idSymbol, idIndustry, idBoard, idMarketCode, idSymbolGcode } = opts;
  
  if (idMarket ||  idSymbol || idIndustry || idBoard || idMarketCode || idSymbolGcode) {
    const ins = await tse.getInstruments(true, true);
    await listIdTables(opts, ins);
  }
}
async function listIdTables(opts, instruments) {
  const { idMarket, idSymbol, idIndustry, idBoard, idMarketCode, idSymbolGcode, idSort } = opts;
  
  const raw = require('./info.json');
  
  Object.keys(raw).forEach(k => raw[k].forEach(j => j.push(0))); // add count col
  
  instruments.forEach(i => {
    let found;
    
    found = raw.Flow.find(j => j[0] === i.Flow);
    if (found) found[found.length-1] += 1;
    
    found = raw.YVal.find(j => j[0] === i.YVal);
    if (found) found[found.length-1] += 1;
    
    found = raw.CSecVal.find(j => j[0] === i.CSecVal);
    if (found) found[found.length-1] += 1;
    
    found = raw.CComVal.find(j => j[0] === i.CComVal);
    if (found) found[found.length-1] += 1;
    
    found = raw.YMarNSC.find(j => j[0] === i.YMarNSC);
    if (found) found[found.length-1] += 1;
    
    found = raw.CGrValCot.find(j => j[0] === i.CGrValCot);
    if (found) found[found.length-1] += 1;
  });
  Object.keys(raw).forEach(k => {
    raw[k] = raw[k].filter(j => j[j.length-1] > 0);
  });
  
  let sorter;
  if (idSort) {
    const str = ''+idSort;
    const match = str.match(/^(\d)_?$/);
    if (match) {
      const n = +match[1];
      const asc = /_/.test(str) ? true : false;
      sorter = asc
        ? (a,b) => typeof a[n]==='number' ? a[n] - b[n] : a[n].localeCompare(b[n], 'fa')  // ascending
        : (a,b) => typeof a[n]==='number' ? b[n] - a[n] : b[n].localeCompare(a[n], 'fa'); // descending
    }
  }
  
  if (idMarket) {
    const rdy = raw.Flow.map(([id,desc,count]) => [id,count,desc]).sort(sorter)
    printTable(rdy, ['id','count','desc']);
  }
  
  if (idSymbol) {
    const rdy = raw.YVal.map(([id,group,desc,count]) => [id, count, group, desc]).sort(sorter);
    printTable(rdy, ['id','count','group','desc']);
    if (sorter) rdy.sort(sorter);
  }
  
  if (idIndustry) {
    const rdy = raw.CSecVal.map(([id,desc,count]) => [id,count,desc]).sort(sorter);
    printTable(rdy, ['id','count','desc']);
  }
  
  if (idBoard) {
    const rdy = raw.CComVal.map(([id,desc,count]) => [id,count,desc]).sort(sorter);
    printTable(rdy, ['id','count','desc']);
  }
  
  if (idMarketCode) {
    const rdy = raw.YMarNSC.map(([id,desc,count]) => [id,count,desc]).sort(sorter);
    printTable(rdy, ['id','count','desc']);
  }
  
  if (idSymbolGcode) {
    const rdy = raw.CGrValCot.map(([id,desc,count]) => [id,count,desc]).sort(sorter);
    printTable(rdy, ['id','count','desc']);
  }
} 
