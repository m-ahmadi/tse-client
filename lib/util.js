const jalaali = require('jalaali-js');

function gregToShamsi(s) {
  const y = s.slice(0, 4);
  const m = s.slice(4, 6);
  const d = s.slice(6, 8);
  
  const o = jalaali.toJalaali(+y, +m, +d);
  let { jy, jm, jd } = o;
  jy = ''+jy;
  jm = jm < 10 ? '0'+jm : ''+jm;
  jd = jd < 10 ? '0'+jd : ''+jd;
  
  return jy + jm + jd;
}

function shamsiToGreg(str) {
  const fs = str.match(/\//g);
  if (!fs || fs.length !== 2) throw new Error('Invalid Date string!');
  
  const j = str.split('/').map(parseFloat);
  const { gy, gm, gd } = jalaali.toGregorian(j[0], j[1], j[2]);
  
  return (gy*10000) + (gm*100) + gd + '';
}

function dateToStr(date) {
  if (!date instanceof Date) throw new Error('Invalid Date object!');
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  
  return (y*10000) + ( (m+1)*100 ) + d + '';
}

function formatDateStr(s) {
  return [s.slice(0, 4), s.slice(4, 6), s.slice(6, 8)].join('/');
}

function msg(...m) {
  if (!''.red) throw new Error("Colors aren't available.");
  const err = m[m.length - 1] !== true;
  const color = err ? 'redBold' : 'yellow';
  const messages = err ? m : m.slice(0, -1);
  let str = messages.map((v, i) => i === 0 ? v[color] : v).join('');
  if (err) {
    process.exitCode = 1;
    str += ' \naborted'.red;
  }
  console.log(str);
}

function safeWinFilename(str) {
  return str
    .replace('\\', ' ')
    .replace('/', ' ')
    .replace('*', ' ')
    .replace(':', ' ')
    .replace('>', ' ')
    .replace('<', ' ')
    .replace('?', ' ')
    .replace('|', ' ')
    .replace('^', ' ')
    .replace('"', ' ');
}

function splitArr(arr, size){
  return arr
    .map( (v, i) => i % size === 0 ? arr.slice(i, i+size) : undefined )
    .filter(i => i);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isObj(v) {
  return (
    v &&
    typeof v === 'object' &&
    typeof v !== null &&
    Object.prototype.toString.call(v) === '[object Object]'
  ) ? true : false;
}
function isStr(v) {
  return typeof v === 'string';
}
function isUndef(v) {
  return typeof v === 'undefined';
}

module.exports = {
  gregToShamsi,
  shamsiToGreg,
  dateToStr,
  formatDateStr,
  msg,
  safeWinFilename,
  splitArr,
  sleep,
  isObj,
  isStr,
  isUndef
};

