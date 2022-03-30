const lang = require("../constants/Languages");
const languages = lang.getList();

function getLanguageFromCode(code) {
  const language = languages.find(language => language.code === code)
  if (typeof language === "undefined") {
    throw Error(`The language code ${code} does not match with any of the known languages.`)
  }
  return language;
}

function getLanguageFromName(name) {
  const language = languages.find(language => language.name.includes(name));
  if (typeof language === "undefined") {
    throw Error(`The language name ${name} does not match with any of the known languages.`)
  }
  return language;
}

function createVMItem(language) {
  return {label: language.name, value: language.code, nativeName: language.nativeName}
}

function normalizeLanguage(language) {
  switch (typeof language) {
    case "string":
      if (language.length === 2) {
        return getLanguageAsItemForVMFromCode(language);
      }
      return getLanguageAsItemForVMFromName(language);

    case "object":
      if (typeof language.value !== "undefined") {
        return language;
      }
      if (typeof language.code !== "undefined") {
        return getLanguageAsItemForVMFromCode(language.code);
      }

      throw Error("Invalid language format");
    default:
      throw Error(`The language should be of type string or object. Provided type ${typeof language}`);
  }
}

function normalizeLanguages(languages) {
  return languages.map(language => normalizeLanguage(language));
}

function getAllLanguagesAsVMItems() {
  let result = [];
  languages.forEach(language => {
    result.push(createVMItem(language));
  });

  return result;
}

function getList() {
  return languages;
}

function getLanguageName(code) {
  let language = getLanguageFromCode(code);
  return language.name;
}

function getLanguageCode(name) {
  let language = getLanguageFromName(name);
  return language.code;
}

function getLanguageAsItemForVMFromCode(code) {
  const language = getLanguageFromCode(code);
  return createVMItem(language);
}

function getLanguageAsItemForVMFromName(name) {
  const language = getLanguageFromName(name);
  return createVMItem(language);
}

function getLanguagesAsVMItemsFromNames(languageNames) {
  const languages = languageNames.map(languageName => getLanguageFromName(languageName));
  const vmItems = languages.map(language => createVMItem(language));
  return vmItems;
}

function getLanguagesAsVMItemsFromCodes(codes) {
  const languages = codes.map(code => getLanguageFromName(code));
  const vmItems = languages.map(language => createVMItem(language));
  return vmItems;
}

function getLanguagesAsVMItems(languageList) {
  const vmItems = languageList.map(language => createVMItem(language));
  return vmItems;
}

module.exports = {
  getList,
  getAllLanguagesAsVMItems,
  getLanguageName,
  getLanguageCode,
  getLanguageAsItemForVMFromCode,
  getLanguageAsItemForVMFromName,
  getLanguagesAsVMItemsFromNames,
  getLanguagesAsVMItemsFromCodes,
  getLanguagesAsVMItems,
  normalizeLanguages
}
