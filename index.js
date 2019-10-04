#!/usr/bin/env node
const cmd = require('commander');
require('./lib/colors');

cmd
  .helpOption('-h, --help', 'Show help.')
  .name('tc')
  .usage('[command] [options]\n  tc --update-instruments\n  tc search faSymbol -b symbol\n  tc select faSymbol1 faSymbol2 [faSymbol3 ...]\n  tc --update-prices\n  tc export --out-dir /tsedata')
  .description('A client for receiving stock data from the Tehran Stock Exchange (TSE).')
  .option('-v, --view [value]',          'View current settings. options: selins|selcols|cols|last|export. \n\t\t\t\t  default: selins\n\t\t\t\t  selins:  selected instruments\n\t\t\t\t  selcols: selected columns\n\t\t\t\t  cols:    list of valid column indexes\n\t\t\t\t  last:    last update of the instruments list\n\t\t\t\t  export:  current export settings')
  .option('-p, --update-prices',         'Update the data of selected instruments.')
  .option('-i, --update-instruments',    'Update the list of instruments.')
  .option('--cache-dir [path]',          'Show or change the location of cacheDir.\n\t\t\t\t  if [path] is provided, new location is set and\n\t\t\t\t  existing content is moved to the new location.')
  .version(''+JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'package.json'), 'utf8')).version, '-V, --version', 'Show version number.');
cmd.command('search <query>').description('Search in instrument symbols or names. (or both)\n\t\t\t\t  specify which with -b option. default: both')
  .option('-t, --search-in <what>',      'Specify search criteria.\n\t\t\t\toptions: symbol|name|both', 'both')
  .action(search);
cmd.command('select [values...]').description('Select instruments or columns.\n\t\t\t\t  default action: select instruments.\n\t\t\t\t  pass -c option to select columns.')
  .option('-c, --columns',               'Boolean. if true, then the selection is for columns. (space/comma separated string of columns)')
  .option('-d, --remove',                'Boolean. if true, then deselect the specified selected instrument(s).')
  .option('--all',                       'Boolean. if true, then select/deselect all instruments.')
  .action(select);
cmd.command('export').description('Create file(s) for current selected instrument(s).\n\t\t\t\t  see options: tc export -h')
  .option('-n, --file-name <num>',       'The filename used for the generated files. options: 0|1|2|3|4 default: 4\n\t\t\t\t0: isin code\n\t\t\t\t1: latin name\n\t\t\t\t2: latin symbol\n\t\t\t\t3: farsi name\n\t\t\t\t4: farsi symbol')
  .option('-x, --file-extension <str>',  'The extension used for the generated files. default: "csv"')
  .option('-d, --delimiter <char>',      'The delimiter used for the generated files. default: ","')
  .option('-a, --adjust-prices <num>',   'Type of price adjustment for the generated files. options: 0|1|2 default: 0\n\t\t\t\t0: none\n\t\t\t\t1: share increase\n\t\t\t\t2: share increase and dividends')
  .option('-e, --encoding <str>',        'Encoding of the generated files. options: utf8|utf8bom default: utf8bom')
  .option('-m, --days-without-trade',    'Boolean. Wheater or not to include days without trade in the generated files. default: false')
  .option('-b, --start-date <date>',     'Starting date of the generated files. default: "1380/01/01"\n\t\t\t\tmust be a shamsi/jalali date and forward-slash separated.\n\t\t\t\tinvalid: "13800101" | "1380-01-01"')
  .option('-r, --no-headers',            'Boolean. Do not generate the header row. default: false')
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
  const settings = await require('./lib/settings').get();
  const getColumns = require('./lib/getColumns');
  const { log, table } = console;
  if (str === 'selins') {
    const last = settings.lastInstrumentUpdate;
    if (last === 'never') return;
    const ins = await require('./lib/getInstruments')(true);
    let selins = settings.selectedInstruments;
    selins = selins.map(i => ins[i].Symbol).join('\n');
    table( selins.length ? selins.yellowBold : 'none'.yellow );
  } else if (str === 'selcols') {
    const selcols = await getColumns()();
    table(selcols);
  } else if (str === 'cols') {
    const colstr = [...Array(15)].map((i,j)=>j).join(',');
    const cols = getColumns(colstr).map( i => ({name: i.name, fname: i.fname}) );
    table(cols);
  } else if (str === 'last') {
    const last = settings.lastInstrumentUpdate;
    const { gregToShamsi: toShamsi, formatDateStr: format } = require('./lib/util');
    const output = last === 'never' ? last.yellow : `${format(last).yellow} (${format(toShamsi(last)).cyan})`;
    log(output);
  } else if (str === 'export') {
    const toShow = Object.assign({}, settings.defaultExport, settings.selectedExport);
    table(toShow);
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
  console.log(res ? res : 'No match for: '.redBold + str.white);
}

async function select(arr, { columns, remove, all }) {
  let args = arr.filter(i => i ? i : undefined);
  args = args.length === 1 ? args[0].split(' ') : args;
  if (!args.length && !all) return;
  const settings = require('./lib/settings');
  const currentSettings = await settings.get();
  if (currentSettings.lastInstrumentUpdate === 'never') return;
  if (columns) {
    const cols = args.join(',').split(',').map(i => i.match(/^\d$|^\d\d$/) ? parseInt(i) : i);
    await settings.set('selectedColumns', cols);
    return;
  }
  const ins = await require('./lib/getInstruments')(true, true);
  const currentSelection = currentSettings.selectedInstruments;
  
  let newSelection = args.filter(i => {
    const found = ins.find(j => j.Symbol === i);
    if (found) {
      return found.InsCode;
    } else {
      console.log('No such instrument: '.redBold + i.white);
    }
  });
  if (!newSelection.length) return;
  
  if (remove) newSelection = currentSelection.filter(i => newSelection.indexOf(i) === -1)
  if (all)    newSelection = remove ? [] : ins.map(i => i.InsCode);
  if (!remove && !all && currentSelection.length > 0) {
    newSelection = newSelection.filter(i => currentSelection.indexOf(i) === -1);
    newSelection = currentSelection.concat(newSelection);
  }
  
  await settings.set('selectedInstruments', newSelection);
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

async function update({ prices, instruments }) {
  if (prices) await require('./updateClosingPrices')();
  if (instruments) await require('./updateInstruments')();
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
    ...!headers         && {showHeaders: headers},
    ...outDir           && {outDir}
  };
  const _settings = require('./lib/settings');
  const selectedExport = await _settings.get('selectedExport');
  if (save) await _settings.set('selectedExport', Object.assign({}, selectedExport, userSettings));
  await require('./generateFiles')(userSettings);
}

