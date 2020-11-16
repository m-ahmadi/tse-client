const tse = require('../tse.js');

(async () => {
  const { data, error } = await tse.getIntraday(['ذوب', 'فولاد', 'خساپا', 'شپنا'], {
    prices: ['close', 'volume', 'count'],
    orders: false,
    trades: ['volume', 'count'],
    client: ['pbvol', 'psvol'],
    misc: true,
    startDate: '20201111'
  });
  
  console.log(data);
  console.log(error);
})();