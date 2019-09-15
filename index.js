// require('./updateInstruments')()
// require('./updateClosingPrices')
const args = process.argv.slice(2);

const selectInstrument = require('./lib/selectInstrument');

const defaultSettings = require('./defaultSettings');
const getInstruments = require('./lib/getInstruments');

if ( args.includes("search") ) search( args[args.indexOf("search")+1] )

function getInstrumentData(userSettings) {
	const settings = Object.assign({}, defaultSettings, userSettings);
	
	
}

async function search(str) {
	const ins = await getInstruments(true, true);
	const res = ins
		.filter(i => i.Symbol.includes(str))
		.map(i => `${i.Symbol} - ${i.Name}`)
		.join('\n');
	console.log(res ? res : `No match for: ` + str);
}

function _selectInstrument() {
	// const ins = await getInstruments(true, true);
	// ins.filter(i => i.Symbol.match('آرمان'))
	
	var x = ins.map(i => `${i.Symbol} (${i.Name})`)
	x = x.sort();
	
	x.filter(i => i.match(/مبا/g)).sort()
	var t;
	
	selectInstrument();
}