import he from './locales/he.json';

export const t = (key, defaultText = "") => {
  const keys = key.split('.');
  let value = he;
  for (const k of keys) {
    if (value === undefined || value === null) return defaultText || key;
    value = value[k];
  }
  return value !== undefined ? value : (defaultText || key);
};
