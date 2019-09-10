const axios = require('axios');

function Instrument(DEven) {
	const params = {
		t: 'Instrument',
		a: ''+DEven
	};
	return makeRequest(params);
}

function InstrumentAndShare(DEven, LastID=0) {
	const params = {
		t: 'InstrumentAndShare',
		a: ''+DEven,
		a2: ''+LastID
	};
	return makeRequest(params);
}

function LastPossibleDeven() {
	const params = {
		t: 'LastPossibleDeven'
	};
	return makeRequest(params);
}

function ClosingPrices(insCodes) {
	const params = {
		t: 'ClosingPrices',
		a: ''+insCodes
	};
	return makeRequest(params);
}

function makeRequest(params) {
	return axios({
		url: 'http://service.tsetmc.com/tsev2/data/TseClient2.aspx',
		method: 'GET',
		params
	});
}

module.exports = {
	Instrument,
	InstrumentAndShare,
	LastPossibleDeven,
	ClosingPrices
};