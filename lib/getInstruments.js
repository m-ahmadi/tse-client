const { join } = require('path');

const settings = require('./settings');
const readFileIntoArray = require('./readFileIntoArray');
const Instrument = require('../struct/Instrument');

module.exports = async function (struct=false, arr=false) {
  const cacheDir = await settings.get('cacheDir');
  const rows = await readFileIntoArray( join(cacheDir, 'instruments.csv') );
  
  const instruments = arr ? [] : {};
  
  for (const row of rows) {
    const item = struct ? new Instrument(row) : row;
    if (arr) {
      instruments.push(item);
    } else {
      instruments[ row.match(/^\d+\b/)[0] ] = item;
    }
  }
  
  return instruments;
};
