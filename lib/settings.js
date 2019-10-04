const fs = require('fs');
const { join } = require('path');
const { promisify } = require('util');
const { parse, stringify: strify } = JSON;
const { isStr, isUndef, isObj } = require('./util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const file = join(__dirname, '../settings.json');

async function get(key) {
  const obj = parse( await readFile(file, 'utf8') );
  if ( isStr(key) ) {
    return obj[key];
  } else if ( isUndef(key) ) {
    return obj;
  } else {
    throw new Error('Invalid argument.');
  }
}

async function set(key, value) {
  const obj = parse( await readFile(file, 'utf8') );
  if ( isObj(key) ) {
    await writeFile(file, strify(obj, null, 2));
    return;
  } else if ( isStr(key) && !isUndef(value) && obj[key] ) {
    obj[key] = value;
    await writeFile(file, strify(obj, null, 2));
  } else {
    throw new Error('Invalid argument(s).');
  }
}

module.exports = { get, set };

