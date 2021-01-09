const tse = require('../tse.js');

(async () => {
  const ins = await tse.getInstruments();
  const syms = ['ذوب', 'فولاد', 'خساپا', 'شپنا'];
  // const syms = ins.filter(i=>['300','303','309'].includes(i.YVal)).map(i=>i.Symbol);
  // const syms = ins.map(i=>i.Symbol);
  
  console.time();
  const { data, error } = await tse.getPrices(syms);
  console.timeEnd();
  
  console.log(error ? 'X' : '√');
})();