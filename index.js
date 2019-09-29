#!/usr/bin/env node
const cmd = require('commander');
require('./lib/colors');

cmd
  .helpOption('-h, --help', 'Show help.')
  .usage('[command] [options]\n  tc search faSymbol -b symbol\n  tc select faSymbol1 faSymbol2 [faSymbol3 ...]\n  tc update\n  tc data')
  .description('A client for receiving Tehran Securities Exchange (TSETMC) data.')
  .option('-v, --view [value]',       'View current settings. options: selins|selcols|cols|lastupdate|export. \n\t\t\t\t  default: selins\n\t\t\t\t  selins:  selected instruments\n\t\t\t\t  selcols: selected columns\n\t\t\t\t  cols:    list of valid column indexes\n\t\t\t\t  export:  current export settings')
  .option('--cache-dir [path]',       'Show or change the location of cacheDir.\n\t\t\t\t  if [path] is provided, new location is set and\n\t\t\t\t  existing content is moved to the new location.')
  .option('-p, --update-prices',      'Update the data of selected instruments.')
  .option('-i, --update-instruments', 'Update the list of instruments.')
  .version(''+JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'package.json'), 'utf8')).version, '-V, --version', 'Show version number.');
cmd.command('search <query>').description('Search in instrument symbols or names. (or both)\n\t\t\t\t  specify which with -b option. default: both')
  .option('-t, --search-in <what>',  'Specify search criteria.\n\t\t\t\toptions: symbol|name|both', 'both')
  .action(search);
cmd.command('select <string...>').description('Select instruments or columns.\n\t\t\t\t  default action: select instruments.\n\t\t\t\t  pass -c option to select columns.')
  .option('-c, --columns',            'Select specified columns. (semicolons & spaces are replaced with newline)')
  .action(select);
cmd.command('export').description('Create file(s) for current selected instrument(s).\n\t\t\t\t  see options: tc export -h')
  .option('-n, --file-name <num>',       'The filename used for the generated files. options: 0|1|2|3|4 default: 4\n\t\t\t\t0: isin code\n\t\t\t\t1: latin name\n\t\t\t\t2: latin symbol\n\t\t\t\t3: farsi name\n\t\t\t\t4: farsi symbol')
  .option('-x, --file-extension <str>',  'The extension used for the generated files. default: "csv"')
  .option('-d, --delimiter <char>',      'The delimiter used for the generated files. default: ","')
  .option('-a, --adjust-prices <num>',   'Type of price adjustment for the generated files. options: 0|1|2 default: 0\n\t\t\t\t0: none\n\t\t\t\t1: share increase\n\t\t\t\t2: share increase and dividends')
  .option('-e, --encoding <str>',        'Encoding of the generated files. options: utf8|utf8bom default: utf8bom')
  .option('-m, --days-without-trade',    'Boolean. Wheater or not to include days without trade in the generated files. default: false')
  .option('-b, --start-date <date>',     'Starting date of the generated files. default: "1380/01/01"\n\t\t\t\tmust be a shamsi/jalali date and forward-slash separated.\n\t\t\t\tinvalid: "13800101" | "1380-01-01"')
  .option('-f, --show-headers',          'Boolean. Wheater or not to generate the header row. default: true')
  .option('-o, --out-dir <path>',        'Location of the generated files. default: ./')
  .option('--save',                      'Boolean. Save the passed options for future use.')
  .action(xport);
cmd.parse(process.argv);

(async function () {
  if (cmd.view) await show(cmd.view);
  if (cmd.cacheDir) await cacheDirHandler(cmd.cacheDir);
  if (cmd.updatePrices) await update({ prices: true });
  if (cmd.updateInstruments) await update({ instruments: true });
})();

async function show(_str) {
  const str = _str === true ? 'selins' : _str;
  const settings = require('./lib/settings');
  const getColumns = require('./lib/getColumns');
  if (str === 'selins') {
    const ins = await require('./lib/getInstruments')(true);
    const selins = await settings.get('selectedInstruments');
    console.table( selins.map(i => ins[i].Symbol).join('\n') );
  } else if (str === 'selcols') {
    const selcols = await getColumns()();
    console.table(selcols);
  } else if (str === 'cols') {
    const colstr = [...Array(15)].map((i,j)=>j).join(',');
    const cols = getColumns(colstr).map( i => ({name: i.name, fname: i.fname}) );
    console.table(cols);
  } else if (str === 'lastupdate') {
    const date = await settings.get('lastInstrumentUpdate');
    const { gregToShamsi: toShamsi, formatDateStr: format } = require('./lib/util');
    const output = date === 'never' ? date.yellow : `${format(date)} (${format(toShamsi(date)).cyan})`;
    console.log(output);
  } else if (str === 'export') {
    const all = await settings.get();
    const toShow = Object.assign({}, all.defaultExport, all.selectedExport);
    console.table(toShow);
  }
}

async function search(str, { searchIn }) {
  if (str.length < 2) {
    console.log('at least 2 characters'.redBold);
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
  console.log(res ? res : 'No match for: '.redBold + str.white);
}

async function select(arr, { columns }) {
  const args = arr.length > 1 ? arr : arr[0].replace(/;| /g, '\n').split('\n');
  if (columns) {
    const writeFile = require('util').promisify(require('fs').writeFile);
    const settings = await require('./lib/settings');
    await settings.set('selectedColumns', args);
    return;
  }
  const ins = await require('./lib/getInstruments')(true, true);
  
  let insCodes = args.map(i => {
    const found = ins.find(j => j.Symbol === i);
    return found ? found.InsCode : console.log('No such instrument: '.redBold + i.white);
  });
  insCodes = insCodes.filter(i => i ? i : undefined).join('\n');
  await require('./lib/selectInstrument')(insCodes);
}

async function cacheDirHandler(_newPath) {
  const newPath = _newPath === true ? undefined : _newPath;
  const { join } = require('path');
  const settings = require('./lib/settings');
  const cacheDir = await settings.get('cacheDir');
  if (newPath) {
    const moveDir = require('./lib/moveDir');
    const moved = await moveDir(cacheDir, newPath);
    if (moved) {
      await settings.set('cacheDir', newPath);
      console.log(`${'cacheDir'.yellow} changed from ${join(__dirname, cacheDir).redBold} to ${join(__dirname, newPath).greenBold}.`);
    } else {
      console.log('directory not empty: '.redBold + join(__dirname, newPath).yellow);
    }
    return;
  }
  console.log( 'cacheDir: '.yellow + join(__dirname, cacheDir).cyan );
}

async function update({ prices, instruments }) {
  if (prices) await require('./updateClosingPrices')();
  if (instruments) await require('./updateInstruments')();
}

async function xport({ fileName, fileExtension, delimiter, adjustPrices, encoding, daysWithoutTrade, startDate, showHeaders, outDir, save }) {
  const log = console.log;
  if ( fileName     && !/^[0-4]$/.test(fileName) )                { log('Invalid fileName.'.redBold);     return; }
  if ( adjustPrices && !/^[0-2]$/.test(adjustPrices) )            { log('Invalid adjustPrices.'.redBold); return; }
  if ( encoding     && !/^utf8$|^utf8bom$/.test(encoding) )       { log('Invalid encoding.'.redBold);     return; }
  if ( startDate    && !/^\d{4}\/\d{2}\/\d{2}$/.test(startDate) ) { log('Invalid startDate.'.redBold);    return; }
  if (outDir) {
    const fs = require('fs');
    const { resolve } = require('path');
    if (!fs.existsSync(outDir))              { log('Invalid outDir.'.redBold+' directory doesn\'t exist: '.red + resolve(outDir)); return; }
    if (!fs.lstatSync(outDir).isDirectory()) { log('Invalid outDir.'.redBold+' path is not a directory: '.red + resolve(outDir));  return; }
  }
  const userSettings = { 
    ...fileName         && {fileName: parseInt(fileName, 10)},
    ...fileExtension    && {fileExtension},
    ...delimiter        && {delimiter},
    ...adjustPrices     && {adjustPrices: parseInt(adjustPrices, 10)},
    ...encoding         && {encoding},
    ...daysWithoutTrade && {daysWithoutTrade},
    ...startDate        && {startDate},
    ...showHeaders      && {showHeaders},
    ...outDir           && {outDir}
  };
  const _settings = require('./lib/settings');
  const selectedExport = await _settings.get('selectedExport');
  if (save) await _settings.set('selectedExport', Object.assign({}, selectedExport, userSettings));
  await require('./generateFiles')(userSettings);
}

