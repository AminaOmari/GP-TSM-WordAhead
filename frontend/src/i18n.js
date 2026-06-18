import en from './locales/en.json';
import he from './locales/he.json';

const locales = { en, he };
let currentLocale = 'en';

export const setLocale = (locale) => {
  if (locales[locale]) {
    currentLocale = locale;
  }
};

export const getLocale = () => currentLocale;

export const t = (key, defaultText = "") => {
  const keys = key.split('.');
  let value = locales[currentLocale];
  for (const k of keys) {
    if (value === undefined || value === null) return defaultText || key;
    value = value[k];
  }
  return value !== undefined ? value : (defaultText || key);
};
