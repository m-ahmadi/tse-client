// orig: InstrumentInfo

class Instrument {
  constructor(_row='') {
    const row = _row.split(',');
    
    if (row.length !== 18) throw new Error('Invalid Instrument data!');

    // unspecified ones are all string
    this.InsCode      = row[0];  // int64 (long)
    this.InstrumentID = row[1];
    this.LatinSymbol  = row[2];
    this.LatinName    = row[3];
    this.CompanyCode  = row[4];
    this.Symbol       = cleanFa(row[5]);
    this.Name         = row[6];
    this.CIsin        = row[7];
    this.DEven        = row[8];  // int32 (int)
    this.Flow         = row[9];  // byte
    this.LSoc30       = row[10];
    this.CGdSVal      = row[11];
    this.CGrValCot    = row[12];
    this.YMarNSC      = row[13];
    this.CComVal      = row[14];
    this.CSecVal      = row[15];
    this.CSoSecVal    = row[16];
    this.YVal         = row[17];
  }
}

function cleanFa(str) {
  return str
    // .replace(/[\u200B-\u200D\uFEFF]/g, ' ')
    .replace(/\u200B/g, '')        // zero-width space
    .replace(/\s?\u200C\s?/g, ' ') // zero-width non-joiner
    .replace(/\u200D/g, '')        // zero-width joiner
    .replace(/\uFEFF/g, '')        // zero-width no-break space
    .replace(/ك/g,'ک')
    .replace(/ي/g,'ی');
}

module.exports = Instrument;