/**
 * Guide home, the Guide tab (task S3, docs/PLAN.md flow F3).
 *
 * The list of check-in spots. With location allowed it is sorted nearest
 * first; without it, it follows Danial's suggested visiting order and says so.
 * Each row shows the stamp the visitor already has, and updates by itself when
 * a stamp is earned.
 *
 * Nothing here reads GPS or localStorage directly: it all comes from the
 * functions in src/core/ and the helpers in src/data/.
 */
import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getPlaces } from '@/data';
import { getPrefs } from '@/core/settings';
import { getProgress, onProgressChange } from '@/core/progress';
import { distanceTo, getPermissionState, getPosition } from '@/core/location';
import LocationExplainer from '@/core/LocationExplainer';
import PlaceCard from './components/PlaceCard';
import { formatDistance, shortNameKey, sortPlaces, stampKind } from './placeList';
import { isWelcomeDone } from './welcomePrefs';

export default function GuideHomeScreen() {
  const { t } = useTranslation();
  const [stamps, setStamps] = useState(() => getProgress().stamps);
  /** The visitor's position, or null while we don't have one. */
  const [position, setPosition] = useState(null);
  /** 'granted' | 'prompt' | 'denied' | 'unknown', or null while we ask. */
  const [permission, setPermission] = useState(null);
  /** True while the first reading is on its way, which can take a few seconds. */
  const [finding, setFinding] = useState(false);

  // Refresh the stamps whenever progress changes (a check-in, another tab, a reset).
  useEffect(() => onProgressChange((progress) => setStamps(progress.stamps)), []);

  // If location is already allowed, take one quick reading to sort the list.
  // A rough reading is enough here (docs/PLAN.md change 14). When it is not
  // allowed yet, <LocationExplainer /> asks first and hands us the reading.
  useEffect(() => {
    let active = true;
    getPermissionState().then(async (state) => {
      if (!active) return;
      setPermission(state);
      if (state !== 'granted') return;
      setFinding(true);
      const reading = await getPosition({ readings: 1 });
      if (!active) return;
      setFinding(false);
      if (reading.ok) setPosition(reading);
    });
    return () => {
      active = false;
    };
  }, []);

  const places = useMemo(() => getPlaces(), []);

  // Metres to every place, or null for the ones whose coordinates are still TBC.
  const distances = useMemo(() => {
    if (!position) return {};
    return Object.fromEntries(places.map((p) => [p.id, distanceTo(p.id, position)]));
  }, [places, position]);

  const sorted = useMemo(() => sortPlaces(places, distances), [places, distances]);
  const byDistance = Object.values(distances).some((d) => Number.isFinite(d));

  // First open: the visitor has not answered the Welcome questions yet (S2).
  // Faris: this moves into App.jsx when you add the redirect there.
  if (!isWelcomeDone(getPrefs())) return <Navigate to="/welcome" replace />;

  return (
    <section>
      <h1 className="text-2xl font-semibold">{t('guide.title', 'City Centre')}</h1>
      <p className="mt-1 text-slate-600">
        {t('guide.subtitle', "Pick a place. We'll show you the way.")}
      </p>

      <div className="mt-4">
        <LocationExplainer onResult={(reading) => reading.ok && setPosition(reading)} />
      </div>

      <p className="mt-4 text-sm text-slate-500">
        {byDistance
          ? t('guide.sortedByDistance', 'Nearest first')
          : t('guide.sortedByOrder', 'In our suggested order')}
      </p>

      {/* GPS can take a few seconds, and the order changes when it lands. Say
          so, instead of letting the list move for no visible reason. */}
      {finding ? (
        <p role="status" className="text-sm text-slate-400">
          {t('location.asking', 'Finding you…')}
        </p>
      ) : null}

      {/* Nothing is broken without location, so this is a hint, not a warning.
          It stays out of the way while the explainer above is asking. */}
      {!byDistance && !finding && permission !== null && permission !== 'prompt' ? (
        <p className="text-sm text-slate-400">
          {t('guide.locationOffHint', 'Turn on location to sort by distance.')}
        </p>
      ) : null}

      {sorted.length === 0 ? (
        <p className="mt-4 text-slate-500">{t('guide.empty', 'No places to show.')}</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {sorted.map((place) => {
            const kind = stampKind(stamps[place.id]);
            return (
              <li key={place.id}>
                <PlaceCard
                  to={`/place/${place.id}`}
                  name={t(shortNameKey(place), t(place.nameKey))}
                  category={t(`categories.${place.category}`, '')}
                  photo={place.photo}
                  distance={formatDistance(t, distances[place.id])}
                  stamp={kind}
                  stampLabel={t(`ui.stamp.${kind}`)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
