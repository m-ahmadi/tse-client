#!/usr/bin/env node
const cmd = require('commander');
const colors = require('colors');

cmd
	.helpOption('-h, --help', 'Show help.')
	.version(''+JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'package.json'), 'utf8')).version, '-v, --version', 'Show version number.')
	.usage('[command] [options]\n  tc search faSymbol -b symbol\n  tc select faSymbol1 faSymbol2 [faSymbol3 ...]\n  tc update\n  tc data')
	.description('A client for receiving Tehran Securities Exchange (TSETMC) data.')
	.option('-s, --show-selected', 'Show list of selected instruments.');
cmd.command('search <query>').description('Search instruments by name, symbol or both.')
	.option('-b, --search-by <criteria>', 'Specify search criteria.\n\t\t\t\toptions: symbol|name|both', 'both')
	.action(search);
cmd.command('select <string...>').description('Select instruments or columns.\n\t\t\t\tBy default selects instruments(s), pass -c option to select columns.\n\t\t\t\tInstruments are selected by their Farsi symbol.')
	.option('-c, --columns', 'Select specified columns. (semicolons & spaces are replaced with newline)')
	.action(select);
cmd.command('update').description('Update data.')
	.option('-p, --prices', 'Update the data of selected instruments.')
	.option('-i, --instrument-list', 'Update the list of instruments.')
	.action(update);
cmd.command('data').description('Get price data.').action(data);
cmd.parse(process.argv);

async function search(str, { searchBy }) {
	if (str.length < 2) {
		console.log('at least 2 characters'.red);
		return;
	}
	const both = searchBy === 'both' ? true : false;
	searchBy = searchBy[0].toUpperCase() + searchBy.slice(1).toLowerCase();
	const getInstruments = require('./lib/getInstruments');
	const ins = await getInstruments(true, true);
	const res = ins
		.filter(i => both ? i.Symbol.includes(str) || i.Name.includes(str) : i[searchBy].includes(str))
		.map(i => `${i.Symbol.yellow.bold} (${i.Name.grey})`)
		.sort()
		.join('\n');
	console.log(res ? res : 'No match for: '.red + str.white);
}