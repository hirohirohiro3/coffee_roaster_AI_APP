// public/uiTranslator.js
import { t } from './i18n.js';

export function updateUIText() {
  // Update text for elements with data-i18n-key
  document.querySelectorAll('[data-i18n-key]').forEach(el => {
    const key = el.dataset.i18nKey;
    if (key) {
      el.textContent = t(key);
    }
  });
}

export function initializeUITranslator() {
  // Listen for the language-changed event to update the UI
  document.addEventListener('language-changed', updateUIText);
  // We call updateUIText() manually after components are loaded.
}
