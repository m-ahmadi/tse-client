const fs = require('fs');
const { promisify } = require('util');
const { isStr, isUndef, isObj } = require('util-ma');
const { parse, stringify: strify } = JSON;
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const file = './settings.json';

async function get(key) {
	const state = parse(await readFile(file, 'utf8'));
	if ( isStr(key) ) {
		return state[key];
	} else if ( isUndef(key) ) {
		return state;
	} else {
		throw new Error('Invalid argument.');
	}
}

async function set(key, value) {
	const state = parse(await readFile(file, 'utf8'));
	if ( isObj(key) ) {
		await writeFile(file, strify(state, null, 2));
		return;
	} else if ( isStr(key) && !isUndef(value) && state[key] ) {
		state[key] = value;
		await writeFile(file, strify(state, null, 2));
	} else {
		throw new Error('Invalid argument(s).');
	}
}

module.exports = { get, set };