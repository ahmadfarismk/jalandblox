/**
 * Welcome screen (task S2, docs/PLAN.md flow F1). The first thing a tourist
 * sees when they open the link or scan the QR code.
 *
 * Three answers: language, nationality (skippable) and where they are now.
 * All three are saved with setPrefs() from core/settings.js, which puts them
 * on the phone. GuideHomeScreen then sends them straight past this screen on
 * every later open.
 *
 * The route is /welcome (added by Faris). It uses his FullScreenLayout, which
 * already gives the page its white background and its padding, so this screen
 * only lays out its own content.
 *
 * Every visible word comes from the language files through t(). Each call also
 * carries its English text, so a key Danial has not written yet never shows as
 * a raw key name.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getLanguages, getPrefs, setPrefs } from '@/core/settings';
import Avatar from '@/shared/Avatar';
import Button from '@/shared/Button';
import { START_CHOICES, countryOptions } from './welcomePrefs';

export default function WelcomeScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const saved = getPrefs();
  const [lang, setLang] = useState(saved.lang);
  const [nationality, setNationality] = useState(saved.nationality ?? '');

  // Country names follow the chosen language, so the list is rebuilt when it changes.
  const countries = useMemo(() => countryOptions(i18n.language), [i18n.language]);

  /** Switches the whole app at once, so the rest of this screen is translated. */
  function chooseLanguage(code) {
    setLang(code);
    setPrefs({ lang: code });
  }

  /** The last answer. Saves all three and leaves the Welcome screen behind. */
  function start(startedFrom) {
    setPrefs({ lang, startedFrom, ...(nationality ? { nationality } : {}) });
    // Just landed: straight to the way into the city (S6). Already in KL: the
    // landmark list. Replacing the entry means Back never returns to Welcome.
    navigate(startedFrom === 'arrival' ? '/arrival' : '/', { replace: true });
  }

  return (
    <section className="mx-auto w-full max-w-md pb-6">
      <h1 className="text-2xl font-semibold">{t('welcome.title', 'Welcome to KL')}</h1>
      <p className="mt-2 text-slate-600">
        {t(
          'welcome.intro',
          "Step-by-step help from the airport to the city's best-known places. Collect a stamp at each one.",
        )}
      </p>

      <fieldset className="mt-8">
        <legend className="mb-2 font-medium">
          {t('welcome.language.title', 'Choose your language')}
        </legend>
        <div className="space-y-2">
          {getLanguages().map(({ code, name }) => (
            <label
              key={code}
              lang={code}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-4 ${
                lang === code ? 'border-teal-700 bg-teal-50' : 'border-slate-200'
              }`}
            >
              <input
                type="radio"
                name="language"
                value={code}
                checked={lang === code}
                onChange={() => chooseLanguage(code)}
                className="size-5 accent-teal-700"
              />
              {name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-8">
        <label htmlFor="nationality" className="font-medium">
          {t('welcome.nationality.title', 'Where are you from?')}
        </label>
        <p className="mt-1 text-sm text-slate-600">
          {t('welcome.nationality.hint', 'Optional. It helps us understand who uses JalanKL.')}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <Avatar size="md" className="shrink-0" />
          <select
            id="nationality"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            autoComplete="country"
            className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            <option value="">{t('welcome.nationality.placeholder', 'Choose your country')}</option>
            {countries.map(({ code, name }) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>
        {/* Leaving the picker alone skips the question too. This is the plain way
            to say so, and it puts the choice back to empty. */}
        <div className="mt-1 flex justify-end">
          <Button variant="quiet" onClick={() => setNationality('')}>
            {t('welcome.nationality.skip', 'Skip')}
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-2 font-medium">{t('welcome.start.title', 'Where are you right now?')}</h2>
        <div className="space-y-3">
          {START_CHOICES.map(({ value, key, label, hintKey, hint }) => (
            <Button
              key={value}
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => start(value)}
              className="py-3"
            >
              <span className="flex flex-col items-center">
                <span>{t(key, label)}</span>
                <span className="text-sm font-normal text-slate-500">{t(hintKey, hint)}</span>
              </span>
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
