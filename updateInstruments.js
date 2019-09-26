const fs = require('fs');
const { join } = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const access = promisify(fs.access);
const log = console.log;

const settings = require('./lib/settings');
const rq = require('./lib/request.v2');
const getInstruments = require('./lib/getInstruments');
const getShares = require('./lib/getShares');
const util = require('./lib/util');


module.exports = async function () {
	const { cacheDir, lastInstrumentUpdate: lastUpdate } = await settings.get();
	const insFile    = join(cacheDir, 'instruments.csv');
	const sharesFile = join(cacheDir, 'shares.csv');
	
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
	
	await settings.set('lastInstrumentUpdate', util.dateToStr(new Date()));
};