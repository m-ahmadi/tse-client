const jalaali = require('jalaali-js');

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

function gregToShamsi(s) {
	const y = s.slice(0, 4);
	const m = s.slice(4, 6);
	const d = s.slice(6, 8);
	
	const o = jalaali.toJalaali(+y, +m, +d);
	let { jy, jm, jd } = o;
	jy = ''+jy;
	jm = jm < 10 ? '0'+jm : ''+jm;
	jd = jd < 10 ? '0'+jd : ''+jd;
	
	return jy + jm + jd;
}

function something() {
	const j = "1380/01/01".split('/').map(v => parseInt(v));
	const d = jalaali.toGregorian(j[0], j[1], j[2]);
	const date = new Date(d.gy, d.gm - 1, d.gd);
	const startDeven = (date.getFullYear()*10000) + ((date.getMonth()+1)*100) + date.getDate();
}

module.exports = {
	safeWinFilename,
	gregToShamsi
};