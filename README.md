### Notes
- Used `fetch` for `Http` requests.  
- Stored  `InstrumentAndShare` data in `localStorage`.  
- Stored `ClosingPrices` data in `indexedDB`.  
- `Instrument.Symbol` characters are [cleaned](https://github.com/m-ahmadi/tse-browser-client/blob/master/tse.js#L158) from `zero-width` characters, `ك` and  `ي`.
- The price adjustment algorithm was ported from the [official Windows app](http://cdn.tsetmc.com/Site.aspx?ParTree=111A11).

Dependency | Why
-------|-------------
`big.js` | For price adjustment calculations.
`jalaali-js` | Only needed due to the `ShamsiDate` column.
`localforage` | For storing in `indexedDB`.
---

### API
Method | Description
-------|-------------
`tse.updateInstruments()` | Update instrument list. (InstrumentAndShare)
  `tse.getPrices(symbols=[], ?settings)` | Update (if needed) and return prices of instruments.

#### Usage:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/big.js/5.2.2/big.min.js"></script>
<script src="path/to/jalaali-js.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/localforage/1.7.3/localforage.min.js"></script>
<script src="tse.js"></script>

<script>
  (async function () {
    await tse.updateInstruments(); // only needed once in a trading day.
    const data = await tse.getPrices(['ذوب', 'فولاد']);
    const adjustedData = await tse.getPrices(['خساپا'], {adjustPrices: 1});
  })()
</script>
```