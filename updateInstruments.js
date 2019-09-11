const fs = require('fs');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const access = promisify(fs.access);
const log = console.log;

const defaultSettings = require('./defaultSettings');
const rq = require('./lib/request.v2');
const getInstruments = require('./lib/getInstruments');
const getShares = require('./lib/getShares');
const util = require('./lib/util');

module.exports = async function (userSettings) {
	const settings = Object.assign({}, defaultSettings, userSettings);
	const { cacheDir } = settings;
	const lastupdateFile = './state/LastInstrumentUpdate.csv';
	const insFile    = cacheDir + '/instruments.csv';
	const sharesFile = cacheDir + '/shares.csv';
	const lastUpdate = await readFile(lastupdateFile, 'utf8');
	
	let lastDeven;
	let lastId;
	
	if (lastUpdate === 'never') {
		promise.all([writeFile(insFile, ''), writeFile(sharesFile, '')]);
		lastDeven = 0;
		lastId = 0;
	} else {
		const insDevens = await getInstruments(true, true).then(d => d.map(i => parseInt(i.DEven)) );
		const shareIds = await getShares(true).then(d => d.map(i => parseInt(i.Idn)));
		lastDeven = Math.max.apply(Math, insDevens);
		lastId    = Math.max.apply(Math, shareIds);
	}
	
	const axiosRes = await rq.InstrumentAndShare(lastDeven, lastId).catch(log);
	const data = axiosRes.data;
	
	const instruments = data.split("@")[0];
	const shares      = data.split("@")[1];
	
	if (instruments === '*') log('Cannot update during trading session hours.');
	if (instruments === '')  log('No new instruments to update.');
	if (shares === '')       log('No new shares to update.');
	
	if (instruments !== '' && instruments !== '*') {
		await writeFile(insFile, instruments.replace(/;/g, '\n').slice(0, -1) );
	}
	
	if (instruments !== '') {
		await writeFile(sharesFile, shares.replace(/;/g, '\n').slice(0, -1) );
	}
	
	await writeFile(lastupdateFile, util.dateToStr(new Date()));
};