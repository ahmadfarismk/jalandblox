/**
 * Landing page: the front door for new visitors at "/", and for anyone at
 * "/about" (the link to share with people who are not travelling right now).
 *
 * Returning visitors who already answered the Welcome questions skip it and
 * go straight to the Guide (see TabLayout in App.jsx).
 *
 * Built from the shared Button and Card so it follows the app's look.
 * Syakir may restyle it; the text lives in the locale files (landing.*).
 */
import { useMemo } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getPlaces } from '@/data';
import Button from '@/shared/Button';
import Card from '@/shared/Card';
import { getLanguages, getPrefs, setPrefs } from './settings';
import { isWelcomeDone } from '@/guide/welcomePrefs';

const HERO_PLACE = 'petronas';
const STEPS = ['pick', 'follow', 'checkin', 'reward'];
const WHY = ['free', 'languages', 'offline', 'private'];

function LanguageSwitch() {
  const { i18n } = useTranslation();
  return (
    <div className="flex gap-1 rounded-full bg-black/35 p-1 backdrop-blur-sm">
      {getLanguages().map(({ code, name }) => (
        <button
          key={code}
          type="button"
          lang={code}
          onClick={() => setPrefs({ lang: code })}
          aria-pressed={i18n.language === code}
          className={`min-h-11 rounded-full px-3 text-sm font-medium ${
            i18n.language === code ? 'bg-white text-slate-900' : 'text-white'
          }`}
        >
          {name}
        </button>
      ))}
    </div>
  );
}

export default function LandingScreen() {
  const { t } = useTranslation();
  const places = useMemo(() => getPlaces(), []);
  const hero = places.find((p) => p.id === HERO_PLACE);
  // New visitors answer the Welcome questions first; returning ones go to the Guide.
  const startTo = isWelcomeDone(getPrefs()) ? '/' : '/welcome';

  const startButton = (
    <Button as={Link} to={startTo} size="lg" fullWidth>
      {t('landing.start')} →
    </Button>
  );

  return (
    <div className="min-h-dvh bg-white text-slate-900">
      {/* Hero */}
      <header
        className="relative bg-slate-800 bg-cover bg-center"
        style={hero?.photo ? { backgroundImage: `url(${hero.photo})` } : undefined}
      >
        <div className="bg-gradient-to-b from-black/30 via-black/45 to-black/80">
          <div className="mx-auto flex min-h-[78dvh] max-w-md flex-col px-4 pt-4 pb-8">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold tracking-tight text-white">JalanKL</span>
              <LanguageSwitch />
            </div>
            <div className="mt-auto space-y-4 text-white">
              <p className="text-sm font-semibold tracking-wide text-teal-200 uppercase">
                {t('landing.eyebrow')}
              </p>
              <h1 className="text-3xl leading-tight font-bold">{t('landing.title')}</h1>
              <p className="text-white/90">{t('landing.intro')}</p>
              {startButton}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-10 px-4 py-8">
        {/* How it works */}
        <section>
          <h2 className="text-xl font-semibold">{t('landing.howTitle')}</h2>
          <ol className="mt-4 space-y-3">
            {STEPS.map((step, i) => (
              <li key={step}>
                <Card className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-700 font-bold text-white"
                  >
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold">{t(`landing.how.${step}.title`)}</h3>
                    <p className="text-sm text-slate-600">{t(`landing.how.${step}.body`)}</p>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        {/* The 7 places */}
        <section>
          <h2 className="text-xl font-semibold">{t('landing.placesTitle')}</h2>
          <ul className="-mx-4 mt-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2">
            {places.map((place) => (
              <li key={place.id} className="w-40 shrink-0 snap-start">
                <div
                  aria-hidden="true"
                  className="aspect-[4/3] rounded-xl bg-slate-100 bg-cover bg-center"
                  style={place.photo ? { backgroundImage: `url(${place.photo})` } : undefined}
                />
                <p className="mt-1 text-sm font-medium">{t(place.nameKey)}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Why */}
        <section>
          <h2 className="text-xl font-semibold">{t('landing.whyTitle')}</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3">
            {WHY.map((key) => (
              <li key={key}>
                <Card className="h-full text-sm font-medium">
                  <span aria-hidden="true" className="mr-1 text-teal-700">
                    ✓
                  </span>
                  {t(`landing.why.${key}`)}
                </Card>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3 text-center">
          <p className="text-lg font-semibold">{t('landing.ready')}</p>
          {startButton}
        </section>
      </main>

      <footer className="mx-auto max-w-md space-y-3 border-t border-slate-200 px-4 py-6 text-sm text-slate-500">
        <Link
          to="/privacy"
          className="inline-flex min-h-11 items-center font-medium text-teal-700 underline"
        >
          {t('landing.privacy')}
        </Link>
        {/* The photo licences require credits wherever the photos appear. */}
        <details>
          <summary className="min-h-11 cursor-pointer py-2">{t('landing.credits')}</summary>
          <ul className="space-y-1 text-xs">
            {places
              .filter((p) => p.photoCredit)
              .map((p) => (
                <li key={p.id}>
                  {t(p.nameKey)}:{' '}
                  <a
                    href={p.photoCredit.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {p.photoCredit.author}, {p.photoCredit.licence}
                  </a>
                </li>
              ))}
          </ul>
        </details>
      </footer>
    </div>
  );
}
