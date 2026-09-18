/**
 * Welcome screen (task S2, docs/PLAN.md flow F1). The first thing a tourist
 * sees when they open the link or scan the QR code.
 *
 * Three answers: language, nationality (skippable) and where they are now.
 * All three are saved with setPrefs() from core/settings.js, which puts them
 * on the phone. GuideHomeScreen then sends them straight past this screen on
 * every later open.
 *
 * Every visible word comes from the language files through t(). Danial's task
 * D2 has not added the welcome.* keys yet, so each call carries its English
 * text as a default: no raw key name can ever show on screen, and his text
 * takes over by itself once the keys exist.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getLanguages, getPrefs, setPrefs } from '@/core/settings';
import Avatar from '@/shared/Avatar';
import Button from '@/shared/Button';
import { START_CHOICES } from './welcomePrefs';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const saved = getPrefs();
  const [lang, setLang] = useState(saved.lang);
  const [nationality, setNationality] = useState(saved.nationality ?? '');

  /** Switches the whole app at once, so the rest of this screen is translated. */
  function chooseLanguage(code) {
    setLang(code);
    setPrefs({ lang: code });
  }

  /** The last answer. Saves all three and leaves the Welcome screen behind. */
  function start(startedFrom) {
    const country = nationality.trim();
    setPrefs({ lang, startedFrom, ...(country ? { nationality: country } : {}) });
    // Both choices open the Guide home for now. "Just landed" goes to /arrival
    // once task S6 builds it.
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-dvh bg-white text-slate-900">
      <div className="mx-auto max-w-md px-4 py-8 pb-12">
        <h1 className="text-2xl font-semibold">{t('welcome.title', 'Welcome to Kuala Lumpur')}</h1>
        <p className="mt-2 text-slate-600">
          {t('welcome.intro', 'A few quick choices to set up your guide.')}
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
            {t('welcome.nationality.hint', 'Optional. You can leave this empty.')}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <Avatar size="md" className="shrink-0" />
            <input
              id="nationality"
              type="text"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              autoComplete="country-name"
              placeholder={t('welcome.nationality.placeholder', 'Your country')}
              className="min-h-12 w-full rounded-lg border border-slate-300 px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            />
          </div>
        </div>

        <div className="mt-8">
          <h2 className="mb-2 font-medium">{t('welcome.start.title', 'Where are you now?')}</h2>
          <div className="space-y-3">
            {START_CHOICES.map(({ value, key, label }) => (
              <Button
                key={value}
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => start(value)}
              >
                {t(key, label)}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
