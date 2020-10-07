const fs = require('fs');
const { join } = require('path');

const defaultSettings = {
  cacheDir: join(__dirname, '../data'),
  lastInstrumentUpdate: 'never',
  selectedSymbols: [],
  selectedColumns: [],
  selectedExportSettings: {},
  defaultColumns: [
    [2, '<TICKER>'],
    [4, '<DTYYYYMMDD>'],
    [6, '<OPEN>'],
    [7, '<HIGH>'],
    [8, '<LOW>'],
    [10, '<CLOSE>'],
    [12, '<VOL>'],
    [11, '<PRICE>'],
    [13, '<COUNT>'],
    [14, '<YESTERDAY>']
  ],
  defaultExportSettings: {
    fileName: 4,
    fileExtension: 'csv',
    delimiter: ',',
    adjustPrices: 0,
    encoding: 'utf8bom',
    daysWithoutTrade: false,
    startDate: '1380/01/01',
    showHeaders: true,
    outDir: join(__dirname, '../')
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
