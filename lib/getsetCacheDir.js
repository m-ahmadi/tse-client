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
const rename    = promisify(fs.rename);
const rmdir     = promisify(fs.rmdir);

const state = require('./state');

module.exports = async function (newpath) {
	const cacheDir = await state.get('cacheDir');
	if (newpath) {
		await moveDir(cacheDir, newPath);
		await state.set('cacheDir', newPath);
		return;
	}
	return cacheDir;
};

async function moveDir(oldPath, newPath) {
	await access(newPath).catch(async err => {
		await mkdir(newPath);
	});
	const stats = await stat(newPath);
	if ( !stats.isDirectory() ) {
		await unlink(newPath);
		await mkdir(newPath);
	}
	const files = await readdir(oldPath);
	for (file of files) {
		const ferom = join(oldPath, file);
		const to = join(newPath, file);
		await rename(ferom, to);
	}
	await rmdir(oldPath);
}