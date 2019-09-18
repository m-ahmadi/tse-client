const fs = require('fs');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const access = promisify(fs.access);

const readFileIntoArray = require('./readFileIntoArray');
const filepath = './state/SelectedInstruments.csv';

module.exports = async function (_insCodes=[]) {
	let insCodes = typeof _insCodes === 'string' ? _insCodes.split('\n') : _insCodes;
	if (insCodes.length < 1) return;
	
	await access(filepath).catch(async err => {
		if (err.code === 'ENOENT') await writeFile(filepath, '');
	});
	const existingFile = await readFileIntoArray(filepath);
	
	if (existingFile.length > 0) {
		insCodes = insCodes.map(i => existingFile.indexOf(i) === -1 ? i : '');
		insCodes = existingFile.concat(insCodes);
	}
	
	const str = insCodes.join('\n');
	await writeFile(filepath, str);
};