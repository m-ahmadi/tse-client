const fs = require('fs');
const { join } = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

require('./lib/colors');
const settings = require('./lib/settings');
const rq = require('./lib/request.v2');
const getInstruments = require('./lib/getInstruments');
const getShares = require('./lib/getShares');
const { dateToStr, msg, getRqErrMsg } = require('./lib/util');

module.exports = async function () {
  const { cacheDir, lastInstrumentUpdate: lastUpdate } = await settings.get();
  const insFile    = join(cacheDir, 'instruments.csv');
  const sharesFile = join(cacheDir, 'shares.csv');
  
  let lastDeven;
  let lastId;
  let currentInstruments;
  let currentShares;
  
  if (lastUpdate === 'never') {
    Promise.all([writeFile(insFile, ''), writeFile(sharesFile, '')]);
    lastDeven = 0;
    lastId = 0;
  } else {
    currentInstruments = await getInstruments();
    currentShares = await getShares(true);
    const insDevens = Object.keys(currentInstruments).map( k => parseInt(currentInstruments[k].match(/\b\d{8}\b/)[0]) );
    const shareIds = currentShares.map( i => parseInt(i.Idn) );
    lastDeven = Math.max.apply(Math, insDevens);
    lastId    = Math.max.apply(Math, shareIds);
  }
  
  let error;
  const { data } = await rq.InstrumentAndShare(lastDeven, lastId).catch(err => error = err);
  if (error) { msg('Failed request: ', 'InstrumentAndShare: ', getRqErrMsg(error).red); return; }
  
  const splitted  = data.split('@');
  let instruments = splitted[0];
  let shares      = splitted[1];
  
  if (instruments === '*') msg('Cannot update during trading session hours.', true);
  if (instruments === '')  msg('Already updated: ', 'Instruments', true);
  if (shares === '')       msg('Already updated: ', 'Shares', true);
  
  if (instruments !== '' && instruments !== '*') {
    if (currentInstruments && Object.keys(currentInstruments).length) {
      instruments.split(';').forEach(i => currentInstruments[ i.match(/^\d+\b/)[0] ] = i);
      instruments = Object.keys(currentInstruments).map(k => currentInstruments[k]).join('\n');
    } else {
      instruments = instruments.replace(/;/g, '\n');
    }
    await writeFile(insFile, instruments);
  }
  
  if (shares !== '') {
    if (currentShares && currentShares.length) {
      shares = currentShares.concat( shares.split(';') ).join('\n');
    } else {
      shares = shares.replace(/;/g, '\n');
    }
    await writeFile(sharesFile, shares);
  }
  
  if ((instruments !== '' && instruments !== '*') || shares !== '') {
    await settings.set('lastInstrumentUpdate', dateToStr(new Date()));
  }
};
