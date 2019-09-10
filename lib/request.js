const axios = require('axios');

function Instrument(DEven) {
	var xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <Instrument xmlns="http://tsetmc.com/">
      <DEven>${DEven}</DEven>
    </Instrument>
  </soap:Body>
</soap:Envelope>`;
	return makeRequest('Instrument', xmlBody);
}

function InstrumentAndShare(DEven, LastID=0) {
	var xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
	<soap:Body>
		<InstrumentAndShare xmlns="http://tsetmc.com/">
			<DEven>${DEven}</DEven>
			<LastID>${LastID}</LastID>
		</InstrumentAndShare>
	</soap:Body>
</soap:Envelope>`;
	return makeRequest('InstrumentAndShare', xmlBody);
}

function LastPossibleDeven() {
	var xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
	<soap:Body>
		<LastPossibleDeven xmlns="http://tsetmc.com/" />
	</soap:Body>
</soap:Envelope>`;
	return makeRequest('LastPossibleDeven', xmlBody);
}

function DecompressAndGetInsturmentClosingPrice(insCodes) {
	var xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
	<soap:Body>
		<DecompressAndGetInsturmentClosingPrice xmlns="http://tsetmc.com/">
			<insCodes>${insCodes}</insCodes>
		</DecompressAndGetInsturmentClosingPrice>
	</soap:Body>
</soap:Envelope>`;
	return makeRequest('DecompressAndGetInsturmentClosingPrice', xmlBody);
}

function makeRequest(soapAction, xmlBody) {
	return axios({
		url: 'http://service.tsetmc.com/WebService/TseClient.asmx',
		method: 'POST',
		headers: {
			'Content-Type': 'text/xml;charset=UTF-8',
			'Content-Length': xmlBody.length,
			'Accept-Encoding': 'gzip,deflate',
			'SOAPAction': 'http://tsetmc.com/'+soapAction,
			'Cache-Control': 'no-cache'
		},
		data: xmlBody
	});
}

module.exports = {
	Instrument,
	InstrumentAndShare,
	LastPossibleDeven,
	DecompressAndGetInsturmentClosingPrice
};