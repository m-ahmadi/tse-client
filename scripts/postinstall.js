const fs = require('fs');

const defaultSettings = {
  cacheDir: 'data',
  lastInstrumentUpdate: 'never',
  selectedInstruments: [],
  selectedColumns: [],
  selectedExport: {},
  defaultColumns: [
    2, '<TICKER>',
    4, '<DTYYYYMMDD>',
    6, '<OPEN>',
    7, '<HIGH>',
    8, '<LOW>',
    10, '<CLOSE>',
    12, '<VOL>',
    11, '<PRICE>',
    13, '<COUNT>',
    14, '<YESTERDAY>'
  ],
  defaultExport: {
    fileName: 4,
    fileExtension: 'csv',
    delimiter: ',',
    adjustPrices: 0,
    encoding: 'utf8',
    daysWithoutTrade: false,
    startDate: '1380/01/01',
    showHeaders: true,
    outDir: '.'
  }
};

(async function () {
  const filePath = './settings.json';
  if ( !fs.existsSync(filePath) ) {
    fs.writeFileSync( filePath, JSON.stringify(defaultSettings, null, 2) );
  }
  
  const cacheDir = await require('../lib/settings').get('cacheDir');
  if ( !fs.existsSync(cacheDir) ) {
    fs.mkdirSync(cacheDir);
  }
})();
