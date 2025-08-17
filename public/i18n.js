// public/i18n.js
let translations = {};
let currentLang = 'ja';

// A function to get the translation for a given key
export function t(key) {
  return translations[key] || `[${key}]`; // Return key in brackets if not found
}

// A function to load a language file and update the UI
export async function setLanguage(lang) {
  // Validate lang to be 'ja' or 'en'
  const validLang = ['ja', 'en'].includes(lang) ? lang : 'ja';

  try {
    const response = await fetch(`./locales/${validLang}.json`);
    if (!response.ok) throw new Error('Language file not found');
    translations = await response.json();

    currentLang = validLang;
    localStorage.setItem('lang', validLang);
    document.documentElement.lang = validLang; // Update the lang attribute on the <html> tag

    // Announce that the language has changed, so other modules can react
    document.dispatchEvent(new CustomEvent('language-changed'));
  } catch (error) {
    console.error('Failed to load language file:', error);
  }
}

// Function to initialize the language setting
export function initI18n() {
    const savedLang = localStorage.getItem('lang');
    const browserLang = navigator.language.startsWith('ja') ? 'ja' : 'en';
    setLanguage(savedLang || browserLang);
}
