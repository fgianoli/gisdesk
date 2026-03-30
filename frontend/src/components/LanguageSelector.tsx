import React from 'react';
import { useTranslation } from 'react-i18next';
import { setLanguage, languageNames, languageFlags, type SupportedLanguage } from '../i18n';
import api from '../api/client';

const LANGUAGES: SupportedLanguage[] = ['it', 'en'];

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const current = i18n.language as SupportedLanguage;

  const change = async (lang: SupportedLanguage) => {
    setLanguage(lang);
    // Salva preferenza nel profilo utente se loggato
    try {
      await api.put('/profile/me', { language: lang });
    } catch {}
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {LANGUAGES.map(lang => (
          <button
            key={lang}
            onClick={() => change(lang)}
            className={`px-2 py-1 rounded text-sm transition ${
              current === lang
                ? 'bg-indigo-600 text-white'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
            }`}
            title={languageNames[lang]}
          >
            {languageFlags[lang]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <select
      value={current}
      onChange={e => change(e.target.value as SupportedLanguage)}
      className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
    >
      {LANGUAGES.map(lang => (
        <option key={lang} value={lang}>
          {languageFlags[lang]} {languageNames[lang]}
        </option>
      ))}
    </select>
  );
}
