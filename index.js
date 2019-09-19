const cmd = require('commander');
const colors = require('colors');

cmd
	.version(''+JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'package.json'), 'utf8')).version, '-v, --version')
	.usage('[command] [options]\n  tc search faSymbol -b symbol\n  tc select faSymbol1 faSymbol2 [faSymbol3 ...]\n  tc update\n  tc data')
	.description('A client for reciving Tehran Securities Exchange (TSETMC) data.')
	.option('s, --show-selected', 'show a list of selected instruments');
cmd.command('search <query>').description('search in instrument names and symbols')
	.option('-b, --search-by <criteria>', 'specify search criteria. options: symbol|name|both', 'both')
	.action(search);
cmd.command('select <string...>').description('select instruments or columns. instrument symbols should be space separated.')
	.option('-t, --target [target]', 'specify target of selection. options: instruments|columns', 'instruments')
	.action(select);
cmd.command('update').description('update data')
	.option('-p, --prices', 'update the data of selected instruments')
	.option('-i, --instrument-list', 'update the list of instruments')
	.action(update);
cmd.command('data').description('get price data').action(data);
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