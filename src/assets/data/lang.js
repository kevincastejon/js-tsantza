// List of language tags on
// https://github.com/libyal/libfwnt/wiki/Language-Code-identifiers#0x0000---0x00ff
//
const fr = require('./fr');
const en = require('./en');

const langs = { fr, en };
module.exports = function (lang, key) {
  return (langs[lang][key]);
};
