// orig: ClosingPriceInfo

const i = parseInt;
const f = parseFloat;

class ClosingPrice {
	constructor(_row='') {
		const row = _row.split(',');
		
		if (row.length !== 11) throw new Error('Invalid ClosingPrice data!');
		
		this.InsCode        = row[0];  // int64
		this.DEven          = row[1];  // int32 (the rest are all decimal)
		this.PClosing       = row[2];  // close
		this.PDrCotVal      = row[3];  // last
		this.ZTotTran       = row[4];  // count
		this.QTotTran5J     = row[5];  // volume
		this.QTotCap        = row[6];  // price
		this.PriceMin       = row[7];  // low
		this.PriceMax       = row[8];  // high
		this.PriceYesterday = row[9];  // yesterday
		this.PriceFirst     = row[10]; // first
	}
}

module.exports = ClosingPrice;