const settings = require('./settings');
const Column = require('../struct/Column');

module.exports = async function (defaults=false, fromArr=[]) {
  if (fromArr.length) {
    return fromArr.map(row => {
      const column = new Column(row);
      const finalHeader = column.header || column.name;
      return { ...column, header: finalHeader };
    });
  }
  
  const _settings = await settings.get();
  let selection = _settings.selectedColumns;
  if (defaults || selection.length < 1) {
    selection = _settings.defaultColumns;
  }
  
  return selection.map(i => {
    const colRowArr = !Array.isArray(i) ? [i] : i;
    const column = new Column(colRowArr);
    const finalHeader = column.header || column.name;
    return { ...column, header: finalHeader };
  });
};