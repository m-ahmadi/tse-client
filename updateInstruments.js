const fs = require('fs');
const u = require('util-ma');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const access = promisify(fs.access);

const defaultSettings = require('./defaultSettings');
const rq = require('./lib/request.v2');
const util = require('./lib/util');
const lastdateFile = './state/LastInstrumentUpdate.txt';

module.exports = async function (userSettings) {
	const settings = Object.assign({}, defaultSettings, userSettings);
	const startDeven = util.shamsiToGreg(settings.startDate);
	
	let deven = await readFile(lastdateFile, 'utf8');
	deven = (!deven || deven === 'never') ? startDeven : deven;
	
	const axiosRes = await rq.InstrumentAndShare(deven).catch(console.log);
	const data = axiosRes.data;
	
	let instruments = data.split("@")[0];
	let shares      = data.split("@")[1];
	
	if (!u.isEmptyStr(instruments) && instruments !== '*') {
		writeFile('./data/instruments.csv', instruments.replace(/;/g, '\n').slice(0, -1) );
	} else {
		throw new Error('Invalid Instruments data!');
	}
	
	if ( !u.isEmptyStr(shares) ) {
		writeFile('./data/shares.csv', shares.replace(/;/g, '\n').slice(0, -1) );
	} else {
		throw new Error('Invalid Shares data!');
	}
	
	writeFile(lastdateFile, util.dateToStr(new Date()));
};