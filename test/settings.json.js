module.exports = () => [
  () => {
    try {
      require('../settings.json'.j);
      return true;
    } catch {
      return false;
    }
  },
];