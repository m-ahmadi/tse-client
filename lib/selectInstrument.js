const fs = require('fs');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const access = promisify(fs.access);

const state = require('./state');

module.exports = async function (_insCodes=[]) {
	let insCodes = typeof _insCodes === 'string' ? _insCodes.split('\n') : _insCodes;
	if (insCodes.length < 1) return;
	
	const prevSelection = await state.get('selectedInstruments');
	
	if (prevSelection.length > 0) {
		insCodes = insCodes.map(i => prevSelection.indexOf(i) === -1 ? i : '');
		insCodes = prevSelection.concat(insCodes);
	}
	
	await state.set('selectedInstruments', insCodes);
};