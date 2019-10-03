const fs = require('fs');
const readFile = require('util').promisify(fs.readFile);

module.exports = async function (path, parseRows=false) {
  const str = await readFile(path, 'utf8');
  if (!str) return [];
  
  const lfstr = str.match(/\r\n/g) !== null ? str.replace(/\r\n/g, '\n') : str;
  const rdystr = lfstr.endsWith('\n') ? lfstr.slice(0, -1) : lfstr;
  
  let res = rdystr.split('\n');
  
  if (parseRows) {
    res = res.map(i => i.indexOf(',') !== -1 ? i.split(',') : i);
  }
  
  return res;
};
