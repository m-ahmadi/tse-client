var jalaali = require('jalaali-js');

var d = jalaali.toGregorian(1380, 01, 01); // "1380/01/01"
var date = new Date(d.gy, d.gm - 1, d.gd);

var startDeven = (date.getFullYear()*10000) + ((date.getMonth()+1)*100) + date.getDate();