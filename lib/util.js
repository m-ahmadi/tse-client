const jalaali = require('jalaali-js');

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

function shamsiToGreg(str) {
	const fs = str.match(/\//g);
	if (!fs || fs.length !== 2) throw new Error('Invalid Date string!');
	
	const j = str.split('/').map(parseFloat);
	const { gy, gm, gd } = jalaali.toGregorian(j[0], j[1], j[2]);
	
	return (gy*10000) + (gm*100) + gd + '';
}

function dateToStr(date) {
	if (!date instanceof Date) throw new Error('Invalid Date object!');
	const y = date.getFullYear();
	const m = date.getMonth();
	const d = date.getDate();
	
	return (y*10000) + ( (m+1)*100 ) + d + '';
}

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

module.exports = {
	safeWinFilename,
	gregToShamsi,
	shamsiToGreg,
	dateToStr
};