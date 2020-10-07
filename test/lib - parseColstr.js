const f = require('../lib/parseColstr.js');
const settings = require('../lib/settings.js');

module.exports = async () => [
  
  f() === undefined,
  
  f('0,1') !== undefined,
  
  f('1,2,3').length === 3,
  
  f('1:A')[0][1] === 'A',
  
  f('1,2:b')[1][1] === 'b',
  
  f('1:A 2:B 3:Z')[2][1] === 'Z',
  
  f('a:b') === undefined,
  
  f('a,b,c') === undefined,
  
  f('a b c:a') === undefined,
  
];