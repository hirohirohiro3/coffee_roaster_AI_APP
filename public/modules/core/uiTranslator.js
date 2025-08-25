// public/uiTranslator.js
import { t } from './i18n.js';

function getOptions(el) {
    if (!el.dataset.i18nOptions) {
        return {};
    }
    try {
        return JSON.parse(el.dataset.i18nOptions);
    } catch (e) {
        console.error('Failed to parse i18n options:', el.dataset.i18nOptions, e);
        return {};
    }
}

export function updateUIText() {
  // Update text for elements with data-i18n-key
  document.querySelectorAll('[data-i18n-key]').forEach(el => {
    const key = el.dataset.i18nKey;
    if (key) {
      const options = getOptions(el);
      el.textContent = t(key, options);
    }
  });

  // Update placeholder text for elements with data-i18n-placeholder-key
  document.querySelectorAll('[data-i18n-placeholder-key]').forEach(el => {
    const key = el.dataset.i18nPlaceholderKey;
    if (key) {
      const options = getOptions(el);
      el.placeholder = t(key, options);
    }
  });

  // Update title text for elements with data-i18n-title-key
  document.querySelectorAll('[data-i18n-title-key]').forEach(el => {
    const key = el.dataset.i18nTitleKey;
    if (key) {
      const options = getOptions(el);
      el.title = t(key, options);
    }
  });

  // Update page title
  const titleEl = document.querySelector('title[data-i18n-key]');
  if (titleEl) {
      const key = titleEl.dataset.i18nKey;
      if (key) {
          document.title = t(key);
      }
  }
}

export function initializeUITranslator() {
  // Listen for the language-changed event to update the UI
  document.addEventListener('language-changed', updateUIText);
  // We call updateUIText() manually after components are loaded.
}
