// orig: ColumnInfo

const ColumnType = [
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

class ColumnConfig {
	constructor(_row='') {
		const row = _row.split(',');
		
		if (row.length !== 4) throw new Error('Invalid ColumnConfig data!');
		
		this.Index   = row[0]; // int32
		this.Type    = ColumnType[ row[1] ]; // ColumnType (ColumnType)Enum.Parse(typeof(ColumnType), strArray[1].ToString())
		this.Header  = row[2]; // string
		this.Visible = row[3]; // boolean row[3] === '1'
	}
}

const ColumnType_ = {
	0:  'CompanyCode',
	1:  'LatinName',
	2:  'Symbol',
	3:  'Name',
	4:  'Date',
	5:  'ShamsiDate',
	6:  'PriceFirst',
	7:  'PriceMax',
	8:  'PriceMin',
	9:  'LastPrice',
	10: 'ClosingPrice',
	11: 'Price',
	12: 'Volume',
	13: 'Count',
	14: 'PriceYesterday'
};

const _ColumnType = {
	CompanyCode:    0,
	LatinName:      1,
	Symbol:         2,
	Name:           3,
	Date:           4,
	ShamsiDate:     5,
	PriceFirst:     6,
	PriceMax:       7,
	PriceMin:       8,
	LastPrice:      9,
	ClosingPrice:   10,
	Price:          11,
	Volume:         12,
	Count:          13,
	PriceYesterday: 14
};

module.exports = ColumnConfig;