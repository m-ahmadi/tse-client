const fs = require('fs');
const { join } = require('path');
const { cacheDir } = require('../defaultSettings');

if ( fs.existsSync(cacheDir) ) rmdirRecursive(cacheDir);

fs.mkdirSync(cacheDir);

function rmdirRecursive(dir) {
  if ( fs.existsSync(dir) ) {
    fs.readdirSync(dir).forEach(file => {
      const curPath = join(dir, file);
      if ( fs.lstatSync(curPath).isDirectory() ) {
        rmdirRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dir);
  }
}