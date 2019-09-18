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

const faColumns = [
	'کد شرکت',
	'نام لاتین',
	'نماد',
	'نام'
	'تاریخ میلادی',
	'تاریخ شمسی',
	'اولین قیمت',
	'بیشترین قیمت',
	'کمترین قیمت',
	'آخرین قیمت',
	'قیمت پایانی',
	'ارزش',
	'حجم',
	'تعداد معاملات',
	'قیمت دیروز'
];

const defaultColumns = [
	indexOf('Symbol'),
	indexOf('Date'),
	indexOf('PriceFirst'),
	indexOf('PriceMax'),
	indexOf('PriceMin'),
	indexOf('ClosingPrice'),
	indexOf('Volume'),
	indexOf('Price'),
	indexOf('Count'),
	indexOf('PriceYesterday')
];

const _columns = [
	{ en: 'CompanyCode',   fa: 'کد شرکت' },
	{ en: 'LatinName',     fa: 'نام لاتین' },
	{ en: 'Symbol',        fa: 'نماد' },
	{ en: 'Name',          fa: 'نام' },
	{ en: 'Date',          fa: 'تاریخ میلادی' },
	{ en: 'ShamsiDate',    fa: 'تاریخ شمسی' },
	{ en: 'PriceFirst',    fa: 'اولین قیمت' },
	{ en: 'PriceMax',      fa: 'بیشترین قیمت' },
	{ en: 'PriceMin',      fa: 'کمترین قیمت' },
	{ en: 'LastPrice',     fa: 'آخرین قیمت' },
	{ en: 'ClosingPrice',  fa: 'قیمت پایانی' },
	{ en: 'Price',         fa: 'ارزش' },
	{ en: 'Volume',        fa: 'حجم' },
	{ en: 'Count',         fa: 'تعداد معاملات' },
	{ en: 'PriceYesterday',fa: 'قیمت دیروز' }
];

function indexOf(str) {
	return columns.indexOf( columns.find(i => i.en === str) );
}