const rq = require('./lib/request');
const xmljs = require('xml-js');
const fs = require('fs');
const u = require('util-ma');

const writeFile = require('util').promisify(fs.writeFile);
const deven = '20010321';


(async function () {
	const axiosRes = await rq.InstrumentAndShare(deven).catch(console.log);
	const response = xmljs.xml2js(axiosRes.data);
	const data = response.elements[0].elements[0].elements[0].elements[0].elements[0].text;
	
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
})();