// orig: ClosingPriceInfo

const i = parseInt;
const f = parseFloat;

class ClosingPrice {
	constructor(_row='') {
		const row = _row.split(',');
		
		if (row.length !== 11) throw new Error('Invalid ClosingPrice data!');
		
		this.InsCode        = row[0];       // int64
		this.DEven          = row[1];       // int32 (the rest are all decimal)
		this.PClosing       = f( row[2] );  // close
		this.PDrCotVal      = f( row[3] );  // last
		this.ZTotTran       = f( row[4] );  // count
		this.QTotTran5J     = f( row[5] );  // volume
		this.QTotCap        = f( row[6] );  // price
		this.PriceMin       = f( row[7] );  // low
		this.PriceMax       = f( row[8] );  // high
		this.PriceYesterday = f( row[9] );  // yesterday
		this.PriceFirst     = f( row[10] ); // first
	}
}

module.exports = ClosingPrice;