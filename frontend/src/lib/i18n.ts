import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from '@/locales/en.json'
import am from '@/locales/am.json'

// Single source of truth for supported languages. Add a code here and a
// matching JSON file under src/locales/ to ship a new language.
export const SUPPORTED_LANGS = ['en', 'am'] as const
export type SupportedLang = (typeof SUPPORTED_LANGS)[number]

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      am: { translation: am },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGS,
    interpolation: { escapeValue: false }, // React already escapes
    detection: {
      // Persist the user's pick so a returning mother doesn't have to re-pick.
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'sile_inat_lang',
      caches: ['localStorage'],
    },
  })

export default i18n
