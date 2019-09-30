const c = {
	red:        31,
	green:      32,
	yellow:     33,
	cyan:       36,
	grey:       90,
	redBold:    91,
	greenBold:  92,
	yellowBold: 93,
	white:      97
};

Object.keys(c).forEach(k => {
	String.prototype.__defineGetter__(k, function () {
		return `[${c[k]}m${this}[0m`;
	});
});