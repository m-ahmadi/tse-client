const fs = require('fs');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const access = promisify(fs.access);

const settings = require('./settings');

module.exports = async function (_insCodes=[]) {
	let insCodes = typeof _insCodes === 'string' ? _insCodes.split('\n') : _insCodes;
	if (insCodes.length < 1) return;
	
	const prevSelection = await settings.get('selectedInstruments');
	
	if (prevSelection.length > 0) {
		insCodes = insCodes.map(i => prevSelection.indexOf(i) === -1 ? i : '');
		insCodes = prevSelection.concat(insCodes);
	}
	
	await settings.set('selectedInstruments', insCodes);
};