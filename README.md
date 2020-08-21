### Notes
- Used [fetch](https://github.com/m-ahmadi/tse-browser-client/blob/master/tse.js#L34) for `HTTP` requests.  
- Storing `InstrumentAndShare` data in `localStorage`.  
- Storing `ClosingPrices` data in `indexedDB`.  
- `Instrument.Symbol` characters are [cleaned](https://github.com/m-ahmadi/tse-browser-client/blob/master/tse.js#L149) from `zero-width` characters, `ك` and  `ي`.
- The [price adjustment algorithm](https://github.com/m-ahmadi/tse-browser-client/blob/master/tse.js#L179) was ported from the [official Windows app](http://cdn.tsetmc.com/Site.aspx?ParTree=111A11).

Dependency | Why
-------|-------------
`big.js` | For price adjustment calculations.
`jalaali-js` | Only needed due to the [ShamsiDate](https://github.com/m-ahmadi/tse-browser-client/blob/master/tse.js#L246) column.
`localforage` | For storing in `indexedDB`.
---

### API
Member | Description
-------|-------------
`tse.API_URL` | The API URL to use for HTTP requests. Only string and valid URL. Default: 'http://service.tsetmc.com/tsev2/data/TseClient2.aspx'
`tse.UPDATE_INTERVAL` | Update data only if these many days have passed since the last update. Only integers. Default: 1
`tse.getInstruments()` | Update (if needed) and return list of instruments. (InstrumentAndShare)
`tse.getPrices(symbols=[], ?settings={...})` | Update (if needed) and return prices of instruments.
_ | Default settings:
```javascript
{
  columns: [
    [4, 'date'],
    [6, 'open'],
    [7, 'high'],
    [8, 'low'],
    [9, 'last'],
    [10, 'close'],
    [12, 'vol']
  ],
  adjustPrices: 0,
  daysWithoutTrade: false,
  startDate: '20010321'
}
```

adjustPrices | desc | desc fa
-------------|------|---------
0 | None | بدون تعدیل
1 | Share increase and dividends | افزایش سرمایه + سود
2 | Share increase | افزایش سرمایه

### Column indexes
index | name | fname
------|------|------------------
0  | CompanyCode    | کد شرکت
1  | LatinName      | نام لاتین
2  | Symbol         | نماد
3  | Name           | نام
4  | Date           | تاریخ میلادی
5  | ShamsiDate     | تاریخ شمسی
6  | PriceFirst     | اولین قیمت
7  | PriceMax       | بیشترین قیمت
8  | PriceMin       | کمترین قیمت
9  | LastPrice      | آخرین قیمت
10 | ClosingPrice   | قیمت پایانی
11 | Price          | ارزش
12 | Volume         | حجم
13 | Count          | تعداد معاملات
14 | PriceYesterday | قیمت دیروز

### Usage:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/big.js/5.2.2/big.min.js"></script>
<script src="path/to/jalaali-js.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/localforage/1.7.3/localforage.min.js"></script>
<script src="tse.js"></script>

<script>
  (async function () {
    const data = await tse.getPrices(['ذوب', 'فولاد']);
    const adjustedData = await tse.getPrices(['خساپا'], {adjustPrices: 1});
	
    const customCols1 = await tse.getPrices(['شپنا'], {columns: [4,7,8]}); // default names
    const customCols2 = await tse.getPrices(['شپنا'], {columns: [[4,'DATE'],[7,'MAX'],[8,'MIN']]}); // custom names
		
    console.table(tse.columnList); // view column indexes and their names
  })()
</script>
```
Get `jalaali-js` for browser: (Windows)
```
mkdir tmp && cd tmp && npm i jalaali-js && echo module.exports = require('jalaali-js'); > x.js && npx browserify x.js -o ../jalaali-js.js -s jalaali && del x.js && cd ../ && rmdir tmp /s /q
```