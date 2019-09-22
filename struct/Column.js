// orig: ColumnInfo

// enum (orig: ColumnType)
const names = [
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

const fnames = [
	'کد شرکت',
	'نام لاتین',
	'نماد',
	'نام',
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

class Column {
	constructor(row=[]) {
		const len = row.length;
		if (len > 2 || len < 1) throw new Error('Invalid Column data!');
		
		this.name   = names[ row[0] ];
		this.fname  = fnames[ row[0] ];
		this.header = row[1];
	}
}

module.exports = Column;