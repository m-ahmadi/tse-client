const fs = require('fs');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const access = promisify(fs.access);

module.exports = async function (path, parseRows=false) {
  let res = [];
  let err;
  await access(path).catch(e => err = e);
  if (err) return res;
  const str = await readFile(path, 'utf8');
  if (!str) return res;
  
  const lfstr = str.match(/\r\n/g) !== null ? str.replace(/\r\n/g, '\n') : str;
  const rdystr = lfstr.endsWith('\n') ? lfstr.slice(0, -1) : lfstr;
  
  res = rdystr.split('\n');
  
  if (parseRows) {
    res = res.map(i => i.indexOf(',') !== -1 ? i.split(',') : i);
  }
  
  return res;
};
