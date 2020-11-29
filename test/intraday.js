const tse = require('../tse.js');

(async () => {
  const { data, error } = await tse.getIntraday(['ذوب', 'فولاد', 'خساپا', 'شپنا'], {
    startDate: '20201122',
    endDate:   '20201123',
    gzip: true,
  });
  
  console.log(data);
  console.log(error);
})();