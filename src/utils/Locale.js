module.exports = function getLocale() {
  return Intl.DateTimeFormat().resolvedOptions().locale;
};
