const { join } = require('path');

const settings = require('./settings');
const readFileIntoArray = require('./readFileIntoArray');
const ClosingPrice = require('../struct/ClosingPrice');

module.exports = async function (insCode) {
  const cacheDir = await settings.get('cacheDir');
  const rows = await readFileIntoArray( join(cacheDir, `${insCode}.csv`) );
  const prices = rows.map( row => new ClosingPrice(row) );
  
  return prices;
};