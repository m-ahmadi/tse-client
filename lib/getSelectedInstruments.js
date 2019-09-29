const settings = require('./settings');
const getInstruments = require('./getInstruments');

module.exports = async function (struct=false, arr=true) {
  const selectedInsCodes = await settings.get('selectedInstruments');
  const result = arr ? [] : {};
  
  if (struct) {
    const instruments = await getInstruments(true);
    selectedInsCodes.forEach(i => {
      const instrument = instruments[i];
      if (!instrument) throw new Error(`Selected instrument: ${insCode} not found in instruments!`);
      if (arr) {
        result.push(instrument);
      } else {
        result[i] = instrument;
      }
    });
    return result;
  } else {
    return selectedInsCodes;
  }
};
