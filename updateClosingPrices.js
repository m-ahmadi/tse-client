const fs = require('fs');
const { join } = require('path');
const { promisify } = require('util');
const { isArr, isObj, isStr } = require('util-ma');
const Big = require('big.js');

const writeFile = promisify(fs.writeFile);
const access = promisify(fs.access);
const log = console.log;

require('./lib/colors');
const settings = require('./lib/settings');
const rq = require('./lib/request.v2');
const getSelectedInstruments = require('./lib/getSelectedInstruments');
const readFileIntoArray = require('./lib/readFileIntoArray');
const Instrument = require('./struct/Instrument');
const ClosingPrice = require('./struct/ClosingPrice');

const startDeven = '20010321';

module.exports = async function () {
  const cacheDir = await settings.get('cacheDir');
  const selection = await getSelectedInstruments(true);
  let error;
  const { data: res } = await rq.LastPossibleDeven().catch(err => error = err);
  if (error)                        { log('Failed request: '.redBold          +'LastPossibleDeven: '+error.code.red+' \nOperation aborted.'.red); return; }
  if ( !/^\d{8};\d{8}$/.test(res) ) { log('Invalid server response: '.redBold +'LastPossibleDeven'                 +' \nOperation aborted.'.red); return; }
  const lastPossibleDeven = res.split(';')[0] || res.split(';')[1];
  
  const validSelection = {};
  let insCodes = [];
  for (instrument of selection) {
    const insCode = instrument.InsCode;
    const market = instrument.YMarNSC === 'NO' ? 0 : 1;
    const filePath = join(cacheDir, `${insCode}.csv`);
    if ( await pathExists(filePath) ) {
      const content = await readFileIntoArray(filePath);
      const lastRow = new ClosingPrice( content[content.length-1] );
      if ( Big(lastPossibleDeven).gt(lastRow.DEven) ) {
        insCodes.push( [insCode, lastRow.DEven, market] );
        validSelection[insCode] = { path: filePath, oldContent: content };
      }
    } else {
      insCodes.push( [insCode, startDeven, market] );
      validSelection[insCode] = { path: filePath };
    }
  }
  insCodes = insCodes.map(i => i.join(',')).join(';');
  
  let { data } = await rq.ClosingPrices(insCodes).catch(err => error = err);
  if (error)                        { log('Failed request: '.redBold          +'ClosingPrices: '+error.code.red+' \nOperation aborted.'.red); return; }
  if ( !/^[\d\.,;@]*$/.test(data) ) { log('Invalid server response: '.redBold +'ClosingPrices'                 +' \nOperation aborted.'.red); return; }
  if (data === '') return;
  data = data.split('@');
  
  const writes = Object.keys(validSelection).map((k, i) => {
    const { path, oldContent } = validSelection[k];
    const newContent = data[i].split(';');
    const content = oldContent ? oldContent.concat(newContent) : newContent;
    return [path, content.join('\n')];
  });
  
  for (write of writes) await writeFile(write[0], write[1]);
};

async function pathExists(path) {
  let res = true;
  await access(path).catch(err => res = false);
  return res;
}

