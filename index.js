#!/usr/bin/env node
const cmd = require('commander');
const colors = require('colors');

cmd
	.helpOption('-h, --help', 'Show help.')
	.usage('[command] [options]\n  tc search faSymbol -b symbol\n  tc select faSymbol1 faSymbol2 [faSymbol3 ...]\n  tc update\n  tc data')
	.description('A client for receiving Tehran Securities Exchange (TSETMC) data.')
	.option('--cache-dir [path]', 'Show or change the location of cacheDir.\n\t\t\t\t  if [path] is provided, new location is set and\n\t\t\t\t  existing content is moved to the new location.')
	.option('--shush [value]', 'Show stuff as well.')
	.version(''+JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'package.json'), 'utf8')).version, '-v, --version', 'Show version number.');
cmd.command('show [value]', ).description('Show stuff. options: selins|selcols|cols|lastupdate. default: selins\n\t\t\t\t  selins:  selected instruments\n\t\t\t\t  selcols: selected columns\n\t\t\t\t  cols:    list of valid column indexes')
	.action(show);
cmd.command('search <query>').description('Search in instrument symbols or names. (or both)\n\t\t\t\t  specify which with -b option. default: both')
	.option('-b, --search-in [what]>', 'Specify search criteria.\n\t\t\t\toptions: symbol|name|both', 'both')
	.action(search);
cmd.command('select <string...>').description('Select instruments or columns.\n\t\t\t\t  default action: select instruments.\n\t\t\t\t  pass -c option to select columns.')
	.option('-c, --columns', 'Select specified columns. (semicolons & spaces are replaced with newline)')
	.action(select);
cmd.command('update').description('Update the data of selected instruments or the instrument list.\n\t\t\t\t  pass -p option to update selected instruments.\n\t\t\t\t  pass -i option to update instrument list.')
	.option('-p, --prices', 'Update the data of selected instruments.')
	.option('-i, --instrument-list', 'Update the list of instruments.')
	.action(update);
cmd.command('export').description('Create file(s) for current selected instrument(s).')
	.option('-f, --file-name',          'The filename used for the generated files.')
	.option('-x, --file-extension',     'The extension used for the generated files.')
	.option('-l, --delimiter',          'The delimiter used for the generated files.')
	.option('-a, --adjust-prices',      'Specify the type of prices for the generated files.')
	.option('-n, --encoding',           'Encoding of the generated files.')
	.option('-t, --days-without-trade', 'Wheater or not to include days without trade in the generated files.')
	.option('-d, --start-date',         'Specify the starting date for the generated files.')
	.option('-e, --show-headers',       'Wheater or not to generate the header row.')
	.option('-o, --out-dir',            'Location of the generated files.')
	.action(xport);
cmd.parse(process.argv);


async function show(str) {
	const readFileIntoArray = await require('./lib/readFileIntoArray');
	const getColumns = require('./lib/getColumns');
	if (str === 'selins') {
		const ins = await require('./lib/getInstruments')(true);
		const selins = await readFileIntoArray('./state/SelectedInstruments.csv');
		console.table( selins.map(i => ins[i].Symbol).join('\n') );
	} else if (str === 'selcols') {
		const selcols = await getColumns()();
		console.table(selcols);
	} else if (str === 'cols') {
		const colstr = [...Array(15)].map((i,j)=>j).join(';');
		const cols = getColumns(colstr).map( i => ({name: i.name, fname: i.fname}) );
		console.table(cols);
	} else if (str === 'lastupdate') {
		const { gregToShamsi: toShamsi, formatDateStr: format } = require('./lib/util');
		let date = await readFileIntoArray('./state/LastInstrumentUpdate.csv');
		date = date[0];
		console.log(`${format(date)} (${format(toShamsi(date)).cyan})`);
	}
}

async function search(str, { searchBy }) {
	if (str.length < 2) {
		console.log('at least 2 characters'.red);
		return;
	}
	const both = searchBy === 'both' ? true : false;
	const propName = searchBy[0].toUpperCase() + searchBy.slice(1).toLowerCase();
	const getInstruments = require('./lib/getInstruments');
	const ins = await getInstruments(true, true);
	const res = ins
		.filter(i => both ? i.Symbol.includes(str) || i.Name.includes(str) : i[propName].includes(str))
		.map(i => `${i.Symbol.yellow.bold} (${i.Name.grey})`)
		.sort()
		.join('\n');
	console.log(res ? res : 'No match for: '.red + str.white);
}

async function select(arr, { columns }) {
	const args = arr.length > 1 ? arr : arr[0].replace(/;| /g, '\n').split('\n');
	if (columns) {
		const writeFile = require('util').promisify(require('fs').writeFile);
		await writeFile('./state/SelectedColumns.csv', args.join('\n'));
		return;
	}
	const ins = await require('./lib/getInstruments')(true, true);
	
	let insCodes = args.map(i => {
		const found = ins.find(j => j.Symbol === i);
		return found ? found.InsCode : console.log('No such instrument: '.red + i.white);
	});
	insCodes = insCodes.filter(i => i ? i : undefined).join('\n');
	await require('./lib/selectInstrument')(insCodes);
}
