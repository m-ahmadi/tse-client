const fs = require('fs');
const { join } = require('path');
const { promisify } = require('util');

const readFile  = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const access    = promisify(fs.access);
const mkdir     = promisify(fs.mkdir);
const stat      = promisify(fs.stat);
const unlink    = promisify(fs.unlink);
const readdir   = promisify(fs.readdir);
const copyFile  = promisify(fs.copyFile);
const rmdir     = promisify(fs.rmdir);

module.exports = async function (oldPath, newPath) {
  await access(newPath).catch(async err => {
    await mkdir(newPath);
  });
  const stats = await stat(newPath);
  if ( !stats.isDirectory() ) {
    await unlink(newPath);
    await mkdir(newPath);
  } else {
    const files = await readdir(newPath);
    if (files.length) return false;
  }
  const files = await readdir(oldPath);
  for (const file of files) {
    const ferom = join(oldPath, file);
    const to = join(newPath, file);
    await copyFile(ferom, to);
    await unlink(ferom);
  }
  await rmdir(oldPath);
  return true;
};
