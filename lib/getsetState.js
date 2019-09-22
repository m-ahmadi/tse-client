const fs = require('fs');
const { promisify } = require('util');
const { parse, stringify: strify } = JSON;
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const file = './state.json';

module.exports = async function (state) {
	if (state) {
		await writeFile(file, strify(state, null, 2));
		return;
	}
	return parse(await readFile(file, 'utf8'));
};