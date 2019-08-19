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

module.exports = { safeWinFilename };