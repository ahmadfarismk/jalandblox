import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import Avatar from '@/shared/Avatar';
import Button from '@/shared/Button';
import { getPlaces } from '@/data';
import InstallHint from '@/core/InstallHint';
import LandmarkStamp from './components/LandmarkStamp';
import PassportStamp from './components/PassportStamp';
import { countryName } from './format';
import { useProgress } from './useProgress';

const FILTERS = {
  all: () => true,
  gold: (kind) => kind === 'gold',
  toVisit: (kind) => kind !== 'gold',
};

// Task D3 · /passport
// All 7 check-in spots as postage stamps (empty, outline or gold) with dates, a
// count, filters, and a way to the next stamp. Everything comes from getProgress().
export default function PassportScreen() {
  const { t, i18n } = useTranslation();
  const progress = useProgress();
  const [filter, setFilter] = useState('all');
  const places = getPlaces();

  const stamps = progress.stamps ?? {};
  const reviewed = progress.reviewed ?? [];
  const stampFor = (id) =>
    stamps[id]?.kind === 'gold' || stamps[id]?.kind === 'outline' ? stamps[id] : null;
  const kindOf = (id) => stampFor(id)?.kind ?? 'none';
  const collected = places.filter((p) => stampFor(p.id)).length;
  const gold = places.filter((p) => kindOf(p.id) === 'gold').length;
  const nationality = countryName(progress.prefs?.nationality, i18n.language);
  const next = places.find((p) => kindOf(p.id) !== 'gold');
  const shown = places.filter((p) => FILTERS[filter](kindOf(p.id)));
  const byId = Object.fromEntries(places.map((p) => [p.id, p]));

  return (
    <div className="mx-auto max-w-lg pb-4">
      <h1 className="sr-only">{t('passport.title')}</h1>

      <header className="flex items-center gap-3">
        <Avatar size="md" className="shrink-0 text-slate-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-500">{t('passport.holder')}</p>
          <p className="truncate text-lg font-semibold text-slate-900">
            <span className="sr-only">{t('passport.nationality')}: </span>
            {nationality ?? t('passport.nationalityNotSet')}
          </p>
        </div>
        <Link
          to="/map"
          aria-label={t('passport.viewOnMap')}
          title={t('passport.viewOnMap')}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-teal-700 text-white active:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5zM9 4v13.5M15 6.5V20" />
          </svg>
        </Link>
      </header>

      {collected === 0 && (
        <section className="mt-6 overflow-hidden rounded-3xl bg-slate-100 p-6 pb-7">
          <div className="relative mx-auto h-52 w-64" aria-hidden="true">
            <div className="absolute top-0 left-2 w-32">
              <LandmarkStamp place={byId.petronas} kind="gold" tilt={-9} />
            </div>
            <div className="absolute top-12 right-2 w-32">
              <LandmarkStamp place={byId['abdul-samad']} kind="gold" tilt={8} />
            </div>
          </div>
          <p className="mt-6 text-[32px] leading-[1.05] tracking-tight text-slate-900">
            <span className="font-extrabold">{t('passport.heroStrong')}</span>
            <br />
            <span className="font-normal">{t('passport.heroLight')}</span>
          </p>
          <p className="mt-3 text-sm text-slate-600">{t('passport.empty')}</p>
        </section>
      )}

      <section className="mt-8" aria-labelledby="collection-title">
        <div className="flex items-end justify-between gap-3">
          <h2 id="collection-title" className="text-2xl font-bold tracking-tight text-slate-900">
            {t('passport.collectionTitle')}
          </h2>
          <p className="text-right text-sm text-slate-500">
            <span className="font-semibold text-slate-900">
              {t('passport.count', { count: collected, total: places.length })}
            </span>
            <br />
            <span>{t('passport.goldCount', { count: gold })}</span>
          </p>
        </div>
        <p className="mt-1 text-sm text-slate-500">{t('passport.collectionHint')}</p>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-label={t('passport.progressLabel')}
          aria-valuemin={0}
          aria-valuemax={places.length}
          aria-valuenow={gold}
        >
          <div
            className="h-full rounded-full bg-orange-500 transition-[width]"
            style={{ width: `${(gold / places.length) * 100}%` }}
          />
        </div>

        {next && (
          <Button as={Link} to={`/place/${next.id}`} size="lg" fullWidth className="mt-5">
            {t('passport.nextStamp')}
            <span aria-hidden="true">→</span>
          </Button>
        )}

        <div
          role="group"
          aria-label={t('passport.filterLabel')}
          className="mt-5 flex gap-2 overflow-x-auto"
        >
          {Object.keys(FILTERS).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
              className={`min-h-11 shrink-0 rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                filter === key
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-100 text-slate-700 active:bg-slate-200'
              }`}
            >
              {t(`passport.filters.${key}`)}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-slate-100 p-5 text-sm text-slate-600">
            {t('passport.noneInFilter')}
          </p>
        ) : (
          <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-7 min-[480px]:grid-cols-3">
            {shown.map((place) => (
              <PassportStamp
                key={place.id}
                place={place}
                stamp={stampFor(place.id)}
                reviewed={reviewed.includes(place.id)}
              />
            ))}
          </ul>
        )}
      </section>

      {gold > 0 && (
        <div className="mt-8">
          <InstallHint />
        </div>
      )}
    </div>
  );
}
