#!/usr/bin/env node
const cmd = require('commander');
require('./lib/colors');

cmd
  .helpOption('-h, --help', 'Show help.')
  .name('tse')
  .usage('[command] [options]\n  tse update --instruments\n  tse search faSymbol -b symbol\n  tse select faSymbol1 faSymbol2 [faSymbol3 ...]\n  tse update --prices\n  tse export --out-dir /tsedata')
  .description('A client for receiving stock data from the Tehran Stock Exchange (TSE).')
  .option('--cache-dir [path]',            'Show or change the location of cacheDir.\n\t\t\t\t\t  if [path] is provided, new location is set and\n\t\t\t\t\t  existing content is moved to the new location.')
  .version(''+JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'package.json'), 'utf8')).version, '-v, --version', 'Show version number.');
cmd.command('list').alias('ls').description('Show information about current settings and more. (help: tse ls -h)')
  .option('-s, --selected-symbols',        'List currently selected symbols.')
  .option('-c, --selected-columns',        'List currently selected columns.')
  .option('-l, --last-instruments-update', 'Show the date of last instruments update.')
  .option('-x, --current-export-settings', 'List current export settings.')
  .option('-f, --filter-match <string>',   'List symbols that match a filter string. (same string syntax as: tse s -f)')
  .option('-a, --all-columns',             'Show all possible column indexes.')
  .option('-m, --id-market',               'Show all possible market-type IDs. "Instrument.Flow"')
  .option('-t, --id-symbol',               'Show all possible symbol-type IDs. "Instrument.YVal"')
  .option('-i, --id-industry',             'Show all possible industry-sector IDs. "Instrument.CSecVal"')
  .option('-b, --id-board',                'Show all possible board IDs. "Instrument.CComVal"')
  .option('-y, --id-market-code',          'Show all possible market-code IDs. "Instrument.YMarNSC"')
  .option('-g, --id-symbol-gcode',         'Show all possible symbol-group IDs. "Instrument.CGrValCot"')
  .option('-o, --id-sort [columnIndex]',   'Sort the IDs table by specifying the index of the column. Negative number means ascending sort.', 1)
  .action(list);
cmd.command('search <query>').alias('f').description('Search in instrument symbols or names. (or both)\n\t\t\t\t\t  specify which with -b option. default: both')
  .option('-t, --search-in <what>',        'Specify search criteria.\n\t\t\t\t\toptions: symbol|name|both', 'both')
  .action(search);
cmd.command('select [input...]').alias('s').description('Select symbols and columns. (help: tse s -h)\n\t\t\t\t\t  if any hyphenless arg is provided then\n\t\t\t\t\t  each arg is treated as one symbol.\n\t\t\t\t\t  example: tse s sym1 sym2 sym3')
  .option('-s, --symbols <string>',        'The space separated string of symbols to select.')
  .option('-c, --columns <string>',        'The space/comma separated string of columns to select. Format:\n\t\t\t\t"index1,index2,..."\n\t\t\t\t"index1:header1 index2:header2 ..."')
  .option('-p, --symbols-file <path>',     'Select symbols from a file that contains newline seperated symbols.')
  .option('-f, --symbols-filter <string>', 'Select symbols based on a space seperated filter string. (AND-based)\n\t\t\t\t\tmarket type:     m=id,id,... \n\t\t\t\t\tsymbol type:     t=id,id,...\n\t\t\t\t\tindustry sector: i=id,id,...\n\t\t\t\t\texample:  tse s -f "t=300,303 i=27"\n\t\t\t\t\t(help: tse ls -m -t -i)"')
  .option('--all',                         'Boolean. if true, then select/deselect all items. (symbols or columns)')
  .option('-d, --remove',                  'Boolean. if true, then operation changes to de-select. (symbols or columns)')
  .action(select);
cmd.command('update').alias('u').description('Download data from the server. (help: tse u -h)')
  .option('-i, --instruments',             'Update the list of instruments.')
  .option('-p, --prices',                  'Update the data of selected instruments.')
  .action(update);
cmd.command('export').alias('x').description('Generate files for current selected instruments. (help: tse x -h)')
  .option('-n, --file-name <num>',         'The filename used for the generated files. options: 0|1|2|3|4 default: 4\n\t\t\t\t\t0: isin code\n\t\t\t\t\t1: latin name\n\t\t\t\t\t2: latin symbol\n\t\t\t\t\t3: farsi name\n\t\t\t\t\t4: farsi symbol')
  .option('-x, --file-extension <str>',    'The extension used for the generated files. default: "csv"')
  .option('-d, --delimiter <char>',        'The delimiter used for the generated files. default: ","')
  .option('-a, --adjust-prices <num>',     'Type of price adjustment for the generated files. options: 0|1|2 default: 0\n\t\t\t\t\t0: none\n\t\t\t\t\t1: share increase and dividends\n\t\t\t\t\t2: share increase')
  .option('-e, --encoding <str>',          'Encoding of the generated files. options: utf8|utf8bom default: utf8bom')
  .option('-m, --days-without-trade',      'Boolean. Wheater or not to include days without trade in the generated files. default: false')
  .option('-b, --start-date <date>',       'Starting date of the generated files. default: "1380/01/01"\n\t\t\t\t\tmust be a shamsi/jalali date and forward-slash separated.\n\t\t\t\t\tinvalid: "13800101" | "1380-01-01"')
  .option('-r, --no-headers',              'Boolean. Do not generate the header row. default: false')
  .option('-o, --out-dir <path>',          'Location of the generated files. default: ./')
  .option('--save',                        'Boolean. Save the passed options for future use.')
  .action(xport);
cmd.parse(process.argv);

(async function () {
  if (!cmd.args.length) cmd.help();
  if (cmd.cacheDir) await cacheDirHandler(cmd.cacheDir);
})();

async function list(opts) {
  const { selectedSymbols, selectedColumns, allColumns, lastInstrumentsUpdate, currentExportSettings, filterMatch } = opts;
  const settings = await require('./lib/settings').get();
  const { log, table } = console;
  
  if (selectedSymbols) {
    const last = settings.lastInstrumentUpdate;
    if (settings.lastInstrumentUpdate === 'never') await require('./updateInstruments')();
    const ins = await require('./lib/getInstruments')(true);
    let selins = settings.selectedSymbols;
    selins = selins.map(i => ins[i].Symbol).join('\n');
    log('\nCurrently selected instruments:'.yellow);
    table( selins.length ? selins.yellowBold : 'none'.yellow );
  }
  
  if (selectedColumns) {
    const getColumns = require('./lib/getColumns');
    const selcols = await getColumns();
    log('\nCurrently selected columns:'.yellow);
    table(selcols);
  }
  
  if (allColumns) {
    const getColumns = require('./lib/getColumns');
    const colstr = [...Array(15)].map((v,i)=>i).join(',');
    const cols = await getColumns(undefined, require('./lib/parseColstr')(colstr));
    log('\nAll valid column indexes:'.yellow);
    table(cols);
  }
  
  if (lastInstrumentsUpdate) {
    const last = settings.lastInstrumentUpdate;
    const { gregToShamsi: toShamsi, formatDateStr: format } = require('./lib/util');
    const output = last === 'never' ? last.yellowBold : `${format(last).yellowBold} (${format(toShamsi(last)).cyan})`;
    log('\nLast instruments update:'.yellow);
    log(output);
  }
  
  if (currentExportSettings) {
    const toShow = {...settings.defaultExportSettings, ...settings.selectedExportSettings};
    log('\nCurrent export settings:'.yellow);
    table(toShow);
  }
  
  if (filterMatch) {
    const filters = parseFilterStr(filterMatch);
    
    if (filters) {
      const ins = await require('./lib/getInstruments')(true, true);
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
  
  const { idMarket, idSymbol, idIndustry, idBoard, idMarketCode, idSymbolGcode } = opts;
  
  if (idMarket ||  idSymbol || idIndustry || idBoard || idMarketCode || idSymbolGcode) {
    await showIdTables(opts);
  }
}

async function search(str, { searchIn }) {
  if (str.length < 2) {
    console.log('At least 2 characters'.redBold);
    return;
  }
  const both = searchIn === 'both' ? true : false;
  const propName = searchIn[0].toUpperCase() + searchIn.slice(1).toLowerCase();
  const getInstruments = require('./lib/getInstruments');
  const ins = await getInstruments(true, true);
  const res = ins
    .filter(i => both ? i.Symbol.includes(str) || i.Name.includes(str) : i[propName].includes(str))
    .map(i => `${i.Symbol.yellowBold} (${i.Name.grey})`)
    .sort()
    .join('\n');
  console.log(res ? res : 'No match for: '.redBold + str.whiteBold);
}

async function select(arr, { symbols, columns, remove, all, symbolsFile, symbolsFilter }) {
  const settings = require('./lib/settings');
  const ins = await require('./lib/getInstruments')(true, true);
  const { log } = console;
  
  if (arr.length) symbols = [...arr];
  
  if (symbolsFile) {
    const fs = require('fs');
    try {
      symbolsFile = fs.readFileSync(symbolsFile, 'utf8').replace(/\ufeff/,'').replace(/\r\n/g, '\n').split('\n');
      if (!symbols) symbols = 1;
    } catch (e) {
      log(e.message.red);
      symbolsFile = undefined;
    }
  }
  
  if (symbolsFilter) {
    const filters = parseFilterStr(symbolsFilter);
    
    if (filters) {
      const { flow, yval, csecval } = filters;
      symbolsFilter = ins.filter(i => (
        (flow && flow.includes(i.Flow)) ||
        (yval && yval.includes(i.YVal)) ||
        (csecval && csecval.includes(i.CSecVal))
      )).map(i => i.Symbol);
      if (!symbols) symbols = 1;
    } else {
      symbolsFilter = undefined;
      log('Invalid filter string.'.redBold);
    }
  }
  
  if (symbols) {
    symbols = typeof symbols === 'string' ? symbols.split(' ') : [];
    if (arr.length)    symbols = [...new Set([...symbols, ...arr])];
    if (symbolsFile)   symbols = [...new Set([...symbols, ...symbolsFile])];
    if (symbolsFilter) symbols = [...new Set([...symbols, ...symbolsFilter])];
    
    const { selectedSymbols, lastInstrumentUpdate } = await settings.get();
    if (lastInstrumentUpdate === 'never') await require('./updateInstruments')();
    
    let newSymbols = symbols.map(i => {
      const found = ins.find(j => j.Symbol === i);
      if (found) {
        return found.InsCode;
      } else {
        log('No such symbol: '.redBold + i.whiteBold);
      }
    }).filter(i=>i);
    
    if (remove) newSymbols = selectedSymbols.filter(i => newSymbols.indexOf(i) === -1);
    if (all)    newSymbols = remove ? [] : ins.map(i => i.InsCode);
    if (!remove && !all && selectedSymbols.length > 0) {
      newSymbols = newSymbols.filter(i => selectedSymbols.indexOf(i) === -1);
      newSymbols = selectedSymbols.concat(newSymbols);
    }
    
    await settings.set('selectedSymbols', newSymbols);
    log('Done.'.green, '(Total symbols:'.grey, (newSymbols.length+'').yellow + ')'.grey);
  }
  
  if (columns) {
    const cols = require('./lib/parseColstr')(columns);
    if (cols) {
      await settings.set('selectedColumns', cols);
      log('Done.'.green, '(Selected'.grey, (cols.length+'').yellow, 'columns)'.grey);
    } else {
      log('Invalid column string.'.red);
    }
  }
}

async function update({ prices, instruments }) {
  if (instruments) await require('./updateInstruments')();
  if (prices)      await require('./updateClosingPrices')();
}

async function xport({ fileName, fileExtension, delimiter, adjustPrices, encoding, daysWithoutTrade, startDate, headers, outDir, save }) {
  const { msg } = require('./lib/util');
  if ( fileName     && !/^[0-4]$/.test(fileName) )                { msg('Invalid fileName.');     return; }
  if ( adjustPrices && !/^[0-2]$/.test(adjustPrices) )            { msg('Invalid adjustPrices.'); return; }
  if ( encoding     && !/^utf8$|^utf8bom$/.test(encoding) )       { msg('Invalid encoding.');     return; }
  if ( startDate    && !/^\d{4}\/\d{2}\/\d{2}$/.test(startDate) ) { msg('Invalid startDate.');    return; }
  if (outDir) {
    const fs = require('fs');
    const { resolve } = require('path');
    if (!fs.existsSync(outDir))              { msg('Invalid outDir.', ' directory doesn\'t exist: '.red, resolve(outDir)); return; }
    if (!fs.lstatSync(outDir).isDirectory()) { msg('Invalid outDir.', ' path is not a directory: '.red, resolve(outDir));  return; }
  }
  const userSettings = { 
    ...fileName         && {fileName: parseInt(fileName, 10)},
    ...fileExtension    && {fileExtension},
    ...delimiter        && {delimiter},
    ...adjustPrices     && {adjustPrices: parseInt(adjustPrices, 10)},
    ...encoding         && {encoding},
    ...daysWithoutTrade && {daysWithoutTrade},
    ...startDate        && {startDate},
    ...headers          && {showHeaders: headers},
    ...outDir           && {outDir}
  };
  const _settings = require('./lib/settings');
  const selectedExportSettings = await _settings.get('selectedExportSettings');
  if (save) await _settings.set('selectedExportSettings', {...selectedExportSettings, ...userSettings});
  await require('./generateFiles')(userSettings);
}

async function cacheDirHandler(_newPath) {
  const newPath = _newPath === true ? undefined : _newPath;
  const { msg } = require('./lib/util');
  const settings = require('./lib/settings');
  const cacheDir = await settings.get('cacheDir');
  if (newPath) {
    const moveDir = require('./lib/moveDir');
    const moved = await moveDir(cacheDir, newPath);
    if (moved) {
      await settings.set('cacheDir', newPath);
      msg('cacheDir ', `changed from ${cacheDir.redBold} to ${newPath.greenBold}.`, true);
    } else {
      msg('Directory not empty: ', newPath);
    }
    return;
  }
  msg('cacheDir: ', cacheDir.cyan, true);
}

// helpers
async function showIdTables(opts) {
  const { idMarket, idSymbol, idIndustry, idBoard, idMarketCode, idSymbolGcode, idSort, idSortAsc } = opts;
  
  const raw = require('./info.json');
  const ins = await require('./lib/getInstruments')(true, true);
  
  Object.keys(raw).forEach(k => raw[k].forEach(j => j.push(0))); // add count col
  
  const { Flow, YVal, CSecVal, CComVal } = raw;
  
  ins.forEach(i => {
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
    const n = Math.abs(+idSort);
    const asc = /^\-/.test(idSort) ? true : false;
    sorter = asc
      ? (a,b) => typeof a[n]==='number' ? a[n] - b[n] : a[n].localeCompare(b[n], 'fa')  // ascending
      : (a,b) => typeof a[n]==='number' ? b[n] - a[n] : b[n].localeCompare(a[n], 'fa'); // descending
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
function parseFilterStr(str='') {
  const map = new Map([ ['m', 'flow'], ['t', 'yval'], ['i', 'csecval'] ]);
  
  const arr = str.split(' ');
  const result = {};
  
  for (const i of arr) {
    if (i.indexOf('=') === -1) continue;
    
    const chunks = i.split('=');
    const [key, val] = [ chunks[0], chunks[1] ];
    
    if ( !map.has(key) )         continue;
    if ( !/^[\d\w,]+$/.test(val) ) continue;
    
    result[ map.get(key) ] = val.split(',')
  }
  
  return Object.keys(result).length === arr.length ? result : undefined;
}

