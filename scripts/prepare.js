const fs = require('fs');
const { execSync }  = require('child_process');
process.env.path += require('path').delimiter + './node_modules/.bin';

execSync('terser node_modules/big.js/big.js -o dep1.js -c -m');

fs.writeFileSync('x.js', "module.exports = require('jalaali-js');");
execSync('browserify x.js -s jalaali | terser -c -m -o dep2.js');

fs.copyFileSync('node_modules/localforage/dist/localforage.min.js', 'dep3.js');
fs.copyFileSync('node_modules/pako/dist/pako.min.js', 'dep4.js');

if (!fs.existsSync('dist')) fs.mkdirSync('dist');
fs.copyFileSync('tse.js', 'dist/tse.js');
execSync('terser tse.js -o dist/tse.min.js -c -m');
fs.writeFileSync('dist/tse.bundle.min.js', ['dep1.js','dep2.js','dep3.js','dep4.js','dist/tse.min.js'].map(i=>fs.readFileSync(i,'utf8')).join('\n'));

['dep1.js', 'dep2.js', 'dep3.js', 'dep4.js', 'x.js'].forEach(fs.unlinkSync);