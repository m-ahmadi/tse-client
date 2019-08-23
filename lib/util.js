function safeWinFilename(str) {
	return str3
		.replace('\\', ' ')
		.replace('/', ' ')
		.replace('*', ' ')
		.replace(':', ' ')
		.replace('>', ' ')
		.replace('<', ' ')
		.replace('?', ' ')
		.replace('|', ' ')
		.replace('^', ' ')
		.replace('"', ' ');
}

function dateStringToShamsi (s) {
	const y = s.slice(0, 4);
	const m = s.slice(4, 6);
	const d = s.slice(6, 8);
	const str = [y, m, d].joint('-');
	return new Date()
}

module.exports = {
	safeWinFilename
};