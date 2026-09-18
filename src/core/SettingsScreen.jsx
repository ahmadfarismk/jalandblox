import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { resetProgress } from './progress';
import { getLanguages, setPrefs } from './settings';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  function reset() {
    resetProgress();
    setConfirmingReset(false);
    setResetDone(true);
  }

  return (
    <section className="space-y-8">
      <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>

      <fieldset>
        <legend className="mb-2 font-medium">{t('settings.language')}</legend>
        <div className="space-y-2">
          {getLanguages().map(({ code, name }) => (
            <label
              key={code}
              lang={code}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-4 ${
                i18n.language === code ? 'border-teal-700 bg-teal-50' : 'border-slate-200'
              }`}
            >
              <input
                type="radio"
                name="language"
                value={code}
                checked={i18n.language === code}
                onChange={() => setPrefs({ lang: code })}
                className="size-5 accent-teal-700"
              />
              {name}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <h2 className="mb-1 font-medium">{t('settings.reset.title')}</h2>
        <p className="mb-3 text-sm text-slate-600">{t('settings.reset.body')}</p>
        {confirmingReset ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="min-h-11 flex-1 rounded-lg bg-red-700 px-4 font-medium text-white"
            >
              {t('settings.reset.confirm')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingReset(false)}
              className="min-h-11 flex-1 rounded-lg border border-slate-300 px-4 font-medium"
            >
              {t('settings.reset.cancel')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setResetDone(false);
              setConfirmingReset(true);
            }}
            className="min-h-11 w-full rounded-lg border border-red-700 px-4 font-medium text-red-700"
          >
            {t('settings.reset.button')}
          </button>
        )}
        {resetDone && (
          <p role="status" className="mt-2 text-sm text-teal-700">
            {t('settings.reset.done')}
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-1 font-medium">{t('settings.privacy.title')}</h2>
        <p className="mb-2 text-sm text-slate-600">{t('settings.privacy.note')}</p>
        <Link
          to="/privacy"
          className="inline-flex min-h-11 items-center font-medium text-teal-700 underline"
        >
          {t('settings.privacy.link')}
        </Link>
        <Link
          to="/about"
          className="ml-4 inline-flex min-h-11 items-center font-medium text-teal-700 underline"
        >
          {t('settings.about')}
        </Link>
      </div>
    </section>
  );
}
