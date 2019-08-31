const columns = {
	'0': {
		nameEn: 'CompanyCode',
		nameFa: 'کد شرکت',
		id: 0
	},
	'1': {
		nameEn: 'LatinName',
		nameFa: 'نام لاتین',
		id: 1
	},
	'2': {
		nameEn: 'Symbol',
		nameFa: 'نماد',
		id: 2
	},
	'3': {
		nameEn: 'Name',
		nameFa: 'نام',
		id: 3
	},
	'4': {
		nameEn: 'Date',
		nameFa: 'تاریخ میلادی',
		id: 4
	},
	'5': {
		nameEn: 'ShamsiDate',
		nameFa: 'تاریخ شمسی',
		id: 5
	},
	'6': {
		nameEn: 'PriceFirst',
		nameFa: 'اولین قیمت',
		id: 6
	},
	'7': {
		nameEn: 'PriceMax',
		nameFa: 'بیشترین قیمت',
		id: 7
	},
	'8': {
		nameEn: 'PriceMin',
		nameFa: 'کمترین قیمت',
		id: 8
	},
	'9': {
		nameEn: 'LastPrice',
		nameFa: 'آخرین قیمت',
		id: 9
	},
	'10': {
		nameEn: 'ClosingPrice',
		nameFa: 'قیمت پایانی',
		id: 10
	},
	'11': {
		nameEn: 'Price',
		nameFa: 'ارزش',
		id: 11
	},
	'12': {
		nameEn: 'Volume',
		nameFa: 'حجم',
		id: 12
	},
	'13': {
		nameEn: 'Count',
		nameFa: 'تعداد معاملات',
		id: 13
	},
	'14': {
		nameEn: 'PriceYesterday',
		nameFa: 'قیمت دیروز',
		id: 14
	}
};

const columns = [
	'CompanyCode',
	'LatinName',
	'Symbol',
	'Name',
	'Date',
	'ShamsiDate',
	'PriceFirst',
	'PriceMax',
	'PriceMin',
	'LastPrice',
	'ClosingPrice',
	'Price',
	'Volume',
	'Count',
	'PriceYesterday'
];

const c = columns;
const defaultColumns = [
	c.indexOf('Symbol'),
	c.indexOf('Date'),
	c.indexOf('PriceFirst'),
	c.indexOf('PriceMax'),
	c.indexOf('PriceMin'),
	c.indexOf('ClosingPrice'),
	c.indexOf('Volume'),
	c.indexOf('Price'),
	c.indexOf('Count'),
	c.indexOf('PriceYesterday'),
	c.indexOf('CompanyCode'),
	c.indexOf('LatinName'),
	c.indexOf('Name'),
	c.indexOf('ShamsiDate'),
	c.indexOf('LastPrice')
];

