import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import it from './locales/it.json';
import en from './locales/en.json';

const SUPPORTED_LANGUAGES = ['it', 'en'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const languageNames: Record<SupportedLanguage, string> = {
  it: 'Italiano',
  en: 'English',
};

export const languageFlags: Record<SupportedLanguage, string> = {
  it: '🇮🇹',
  en: '🇬🇧',
};

const savedLang = localStorage.getItem('language') || 'it';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      it: { translation: it },
      en: { translation: en },
    },
    lng: savedLang,
    fallbackLng: 'it',
    interpolation: {
      escapeValue: false,
    },
  });

export function setLanguage(lang: SupportedLanguage) {
  i18n.changeLanguage(lang);
  localStorage.setItem('language', lang);
}

export default i18n;
