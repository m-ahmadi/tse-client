const fs            = require('fs');
const { join }      = require('path');
const performance   = require('perf_hooks').performance;
const { promisify } = require('util');
const Big           = require('big.js');
const writeFile = promisify(fs.writeFile);
const access    = promisify(fs.access);

require('./lib/colors');
const settings                 = require('./lib/settings');
const rq                       = require('./lib/request.v2');
const getSelectedInstruments   = require('./lib/getSelectedInstruments');
const readFileIntoArray        = require('./lib/readFileIntoArray');
const ClosingPrice             = require('./struct/ClosingPrice');
const { msg, getRqErrMsg, splitArr, sleep } = require('./lib/util');

const startDeven = '20010321';

const UPDATE_CHUNK       = 50;
const UPDATE_CHUNK_DELAY = 3000;
const UPDATE_RETRY_COUNT = 3;
const UPDATE_RETRY_DELAY = 5000;

module.exports = async function () {
  const selection = await getSelectedInstruments(true);
  if (!selection.length)            { msg('No selected instruments.'); return; }
  
  const cacheDir = await settings.get('cacheDir');
  let error;
  const { data: res } = await rq.LastPossibleDeven().catch(err => error = err);
  if (error)                        { msg('Failed request: ',          'LastPossibleDeven: ', getRqErrMsg(error).red); return; }
  if ( !/^\d{8};\d{8}$/.test(res) ) { msg('Invalid server response: ', 'LastPossibleDeven'); return; }
  const lastPossibleDeven = res.split(';')[0] || res.split(';')[1];
  
  const updateNeeded = {};
  for (const instrument of selection) {
    const insCode = instrument.InsCode;
    const market = instrument.YMarNSC === 'NO' ? 0 : 1;
    const filePath = join(cacheDir, `${insCode}.csv`);
    if ( await pathExists(filePath) ) {
      const content = await readFileIntoArray(filePath);
      const lastRow = new ClosingPrice( content[content.length-1] );
      const lastRowDEven = lastRow.DEven;
      if ( Big(lastPossibleDeven).gt(lastRowDEven) ) {
        updateNeeded[insCode] = {
          uriSegs: [insCode, lastRowDEven, market],
          path: filePath,
          oldContent: content,
          insCode
        };
      }
    } else {
      updateNeeded[insCode] = {
        uriSegs: [insCode, startDeven, market],
        path: filePath,
        insCode
      };
    }
  }
  if (!Object.keys(updateNeeded).length) { msg('Already updated.', true); return; }
  
  const t1 = performance.now();
  const { succs, fails } = await retrier(updateNeeded);
  
  const writes = Object.keys(updateNeeded).map((k, i) => {
    const { path, oldContent } = updateNeeded[k];
    const newContentStr = succs[k];
    let content = oldContent || [];
    if (newContentStr) {
      const newContent = newContentStr.split(';');
      content = oldContent ? oldContent.concat(newContent) : newContent;
      return [path, content.join('\n')];
    }
  }).filter(i=>i);
  
  for (const write of writes) await writeFile(write[0], write[1]);
  
  
  const [ slen, flen ] = [succs, fails].map(i => Object.keys(i).length);
  const time = ((performance.now()- t1) / 1000).toFixed(1);
  if (flen) {
    const message = 'Incomplete Price Update: '.red +
      ('Failed: '+flen).redBold +
      '  '+
      ('Updated: '+slen).greenBold +
      ` (after ${(''+UPDATE_RETRY_COUNT).yellow} retries and ${time.yellow} seconds)`;
    
    console.log(message);
    process.exitCode = 1;
  } else {
    console.log('Done.'.green, `(took ${time.yellow} seconds)`);
  }
};

async function pathExists(path) {
  let res = true;
  await access(path).catch(err => res = false);
  return res;
}

async function retrier(updateNeeded={}, count=0, result={}) {
  const keys = Object.keys(updateNeeded);
  const chunks = splitArr(keys, UPDATE_CHUNK).map( i => i.map(k=> updateNeeded[k]) );
  
  const proms = [];
  for (const chunk of chunks) {
    proms.push( requester(chunk) );
    await sleep(UPDATE_CHUNK_DELAY);
  }
  const settled = await Promise.allSettled(proms);
  const res = settled.map(i => i.value);
  
  const fails = res.filter(i => i.error).reduce((a,{result:c})=> c.forEach(i=> a[i.insCode] = i) || a, {});
  const succs = res.filter(i => !i.error).reduce((a,{result:c}) => Object.keys(c).forEach(k=> a[k] = c[k]) || a, {});
  
  result.succs = {...result.succs, ...succs};
  result.fails = {...fails};
  
  count++;
  if (count > UPDATE_RETRY_COUNT) return result;
  
  if (Object.keys(fails).length) {
    result = await new Promise(async (resolve, reject) => {
      await sleep(UPDATE_RETRY_DELAY);
      const r = await retrier(fails, count, result);
      resolve(r);
    });
  }
  
  return result;
}

async function requester(chunk=[]) {
  let res;
  const mkRes = (result, error, reqError) => ({ result, error, reqError });
  
  const insCodes = chunk.map(i => i.uriSegs.join(',')).join(';');
  
  let error;
  const { data: resp } = await rq.ClosingPrices(insCodes).catch(r => error = r);
  if (error)                          { res = mkRes(chunk, 'Failed request: ClosingPrices', error);   return res; }
  if ( !/^[\d\.,;@\-]*$/.test(resp) ) { res = mkRes(chunk, 'Invalid server response: ClosingPrices'); return res; }
  if (resp === '')                    { res = mkRes(chunk, 'Unknown Error.');                         return res; }
  
  const o = {};
  resp.split('@').forEach((v,i)=> o[chunk[i].insCode] = v);
  res = mkRes(o)
  
  return res;
}