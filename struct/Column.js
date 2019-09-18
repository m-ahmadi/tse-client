// orig: ColumnInfo

// enum (orig: ColumnType)
const columnTypes = [
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

class Column {
	constructor(_row='') {
		const row = _row.split(',');
		
		if (row.length !== 2) throw new Error('Invalid Column data!');
		
		this.Type   = columnTypes[ row[0] ];
		this.Header = row[1];
	}
}

module.exports = Column;