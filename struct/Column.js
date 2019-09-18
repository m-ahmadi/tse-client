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
		
		if (row.length !== 4) throw new Error('Invalid Column data!');
		
		this.Index   = parseInt(row[0], 10); // int32
		this.Type    = ColumnType[ row[1] ]; // ColumnType (ColumnType)Enum.Parse(typeof(ColumnType), strArray[1].ToString())
		this.Header  = row[2];               // string
		this.Visible = row[3] === '1';       // boolean row[3] === '1'
	}
}

module.exports = Column;