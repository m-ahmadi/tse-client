module.exports = {
	filename: 4,
		// 0:  Isin code
		// 1:  latin name
		// 2:  latin symbol
		// 3:  fa name
		// 4:  fa symbol
		// default: 0
	fileExtension: '',
	delimiter: '',
	adjustPrices: 2,
		// 0:  none
		// 1:  capital increase
		// 2:  capital increase and dividends
		// default: 0
	encoding: 1,
		// 0:  unicode
		// 1:  utf8
		// 2:  ascii
		// default: 1
	daysWithoutTrade: false,
	startDate: '1380/01/01', // '20010321'
	showHeaders: true,
	storageLocation: './' // experimental
};