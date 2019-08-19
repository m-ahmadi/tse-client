// orig: ClosingPriceInfo

const i = parseInt;
const f = parseFloat;

class ClosingPriceRow {
	constructor(_row='') {
		const row: _row.split(',');
		
		if (row.length !== 11) throw new TypeError('Invalid ClosingPriceRow data!');
		
		this.InsCode        = row[0];  // int64
		this.DEven          = row[1];  // int32
		this.PClosing       = row[2];  // decimal (rest all decimal) 
		this.PDrCotVal      = row[3];
		this.ZTotTran       = row[4];
		this.QTotTran5J     = row[5];
		this.QTotCap        = row[6];
		this.PriceMin       = row[7];
		this.PriceMax       = row[8];
		this.PriceYesterday = row[9];
		this.PriceFirst     = row[10];
	}
}

module.exports = ClosingPriceRow;