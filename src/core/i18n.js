/**
 * Translations (react-i18next).
 *
 * - Every file in src/data/locales/ is loaded automatically, so adding a
 *   language is just adding a file (docs/PLAN.md section 10, Languages).
 * - The language comes from the saved preferences. Calling setPrefs({ lang })
 *   anywhere switches every screen at once.
 * - Missing text in one language falls back to English.
 *
 * Screens use it like this:
 *   const { t } = useTranslation();
 *   <h1>{t('settings.title')}</h1>
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { onProgressChange } from './progress';
import { getPrefs } from './real/settings.real';

export const FALLBACK_LANG = 'en';

const files = import.meta.glob('../data/locales/*.json', { eager: true, import: 'default' });

/** { en: { translation: {...} }, ms: { translation: {...} } } */
const resources = Object.fromEntries(
  Object.entries(files).map(([path, json]) => [
    path.match(/([\w-]+)\.json$/)[1],
    { translation: json },
  ]),
);

const codes = Object.keys(resources);

/** A language we have a file for, or English. */
const supported = (lang) => (codes.includes(lang) ? lang : FALLBACK_LANG);

function languageName(code) {
  const fromFile = resources[code].translation.meta?.languageName;
  if (fromFile) return fromFile;
  try {
    return new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * Every language the app has a file for, e.g.
 * [{ code: 'en', name: 'English' }, { code: 'ms', name: 'Bahasa Melayu' }]
 * Names are shown in their own language, so a visitor can always find theirs.
 */
export function getLanguages() {
  return codes.map((code) => ({ code, name: languageName(code) }));
}

i18n.on('languageChanged', (lang) => {
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
});

i18n.use(initReactI18next).init({
  resources,
  lng: supported(getPrefs().lang),
  fallbackLng: FALLBACK_LANG,
  interpolation: { escapeValue: false }, // React already escapes text
});

// Follow the saved language whenever preferences change.
onProgressChange((progress) => {
  const lang = supported(progress.prefs.lang);
  if (lang !== i18n.language) i18n.changeLanguage(lang);
});

export default i18n;
