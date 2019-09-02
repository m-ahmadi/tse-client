// orig: TseShareInfo

const i = parseInt;

class Share {
	constructor(_row='') {
		const row = _row.split(',');
		
		if (row.length !== 5) throw new Error('Invalid Share data!');
		
		this.Idn              = row[0];      // long
		this.InsCode          = row[1];      // long
		this.DEven            = row[2];      // int
		this.NumberOfShareNew = i( row[3] ); // Decimal
		this.NumberOfShareOld = i( row[4] ); // Decimal
	}
}

module.exports = Share;