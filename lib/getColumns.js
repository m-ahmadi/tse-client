const state = require('./state');
const Column = require('../struct/Column');

async function fromFile(defaults=false) {
	const _state = await state.get();
	let selection = _state.selectedColumns;
	if (defaults || selection.length < 1) {
		selection = _state.defaultColumns;
	}
	return selection.map(parse).filter(filt);
}

module.exports = function (fromStr='') {
	if (fromStr) {
		return fromStr
		.split(',')
		.map(i => i.match(/^\d$|^\d\d$/) ? parseInt(i) : undefined)
		.map(parse)
		.filter(filt);
	} else {
		return fromFile;
	}
};

function parse(v, i, a) {
	if (typeof v === 'number') {
		const next = a[i+1];
		let row = [];
		row.push(v);
		if (typeof next === 'string') row.push(next);
		return new Column(row);
	}
}

function filt(i) {
	return i ? i : undefined;
}