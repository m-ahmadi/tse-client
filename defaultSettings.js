module.exports = {
	filename: 4,
		// 0:  Isin code
		// 1:  latin name
		// 2:  latin symbol
		// 3:  fa name
		// 4:  fa symbol
	fileExtension: 'csv',
	delimiter: ',',
	adjustPrices: 0,
		// 0:  none
		// 1:  share increase
		// 2:  share increase and dividends
	encoding: 0,
		// 0:  utf8-bom
		// 1:  utf8
	daysWithoutTrade: false,
	startDate: '1380/01/01', // '20010321'
	showHeaders: true,
	outDir: '.',
	cacheDir: 'data'
};