const fetch = require('node-fetch');

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
	const url = new URL('http://service.tsetmc.com/tsev2/data/TseClient2.aspx');
	url.search = new URLSearchParams(params).toString();
	
	return new Promise((resolve, reject) => {
		fetch(url).then(async res => {
			res.status === 200 ? resolve(await res.text()) : reject(res.status +' '+ res.statusText);
		}).catch(err => reject(err));
	});
	
	/* return axios({
		url: 'http://service.tsetmc.com/tsev2/data/TseClient2.aspx',
		method: 'GET',
		params
	}); */
}

module.exports = {
	Instrument,
	InstrumentAndShare,
	LastPossibleDeven,
	ClosingPrices
};