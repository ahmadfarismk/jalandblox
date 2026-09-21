/**
 * Map screen (task S7, colour unlock S8, 3D scene S12/S13).
 *
 * An overview of the City Centre with the seven check-in spots on it. Each
 * landmark is grey until its gold stamp is earned, then it turns gold, and it
 * does that live: this screen listens for progress changes. Tapping one opens
 * the landmark.
 *
 * Two maps, one screen:
 * - The 3D city (CityMap3D) on phones that can draw it. Landmark models stand
 *   on the real street layout, at their real positions.
 * - The flat map (FlatMap) everywhere else: no WebGL, a phone saving data, a
 *   small phone, the simple-map setting, or a crash in the 3D scene.
 *
 * Everything that decides grey or gold lives here, so both maps get it for
 * free. Neither map needs a tile service or an API key, so both work offline.
 */
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getPlaces } from '@/data';
import { getProgress, onProgressChange } from '@/core/progress';
import { getPermissionState, watchPosition } from '@/core/location';
import { getPrefs } from '@/core/settings';
import FlatMap from './components/FlatMap';
import MapErrorBoundary from './components/MapErrorBoundary';
import MapAttribution from './components/MapAttribution';
import MapLegend from './components/MapLegend';
import { canRender3D, detectMapEnv } from './mapCapability';
import { newlyGold } from './placeList';

// Only fetched when a phone can actually draw it, so the Guide and Passport
// tabs never pay for the 3D library.
const CityMap3D = lazy(() => import('./components/CityMap3D'));

export default function MapScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stamps, setStamps] = useState(() => getProgress().stamps);
  const [position, setPosition] = useState(null);
  const [locationOn, setLocationOn] = useState(true);

  /** Places whose icon has just turned gold, so the map can mark the change. */
  const [justUnlocked, setJustUnlocked] = useState([]);
  const stampsRef = useRef(stamps);

  // What this phone can draw, decided once when the screen opens. It becomes
  // false if the 3D scene then fails, so the flat map takes over.
  const [use3D, setUse3D] = useState(() => canRender3D(detectMapEnv(getPrefs())));

  // Gold stamps colour the landmarks in, with no reload (task S8). A check-in
  // on another screen, or in another tab, arrives here the same way.
  useEffect(
    () =>
      onProgressChange((progress) => {
        const unlocked = newlyGold(stampsRef.current, progress.stamps);
        stampsRef.current = progress.stamps;
        setStamps(progress.stamps);
        if (unlocked.length > 0) setJustUnlocked(unlocked);
      }),
    [],
  );

  // The mark is a moment, not a state: it fades after a few seconds.
  useEffect(() => {
    if (justUnlocked.length === 0) return undefined;
    const timer = setTimeout(() => setJustUnlocked([]), 4000);
    return () => clearTimeout(timer);
  }, [justUnlocked]);

  // A live position while this screen is open. watchPosition() pauses itself
  // when the app is hidden and gives back the function that stops it.
  useEffect(() => {
    let stop;
    let active = true;
    getPermissionState().then((state) => {
      if (!active) return;
      if (state !== 'granted') {
        setLocationOn(false);
        return;
      }
      stop = watchPosition((reading) => {
        if (reading.ok) setPosition(reading);
      });
    });
    return () => {
      active = false;
      stop?.();
    };
  }, []);

  const places = useMemo(() => getPlaces(), []);

  const mapProps = {
    places,
    stamps,
    justUnlocked,
    position,
    onSelect: (placeId) => navigate(`/place/${placeId}`),
    // A phone can take the graphics context away: fall back to the flat map.
    onFail: () => setUse3D(false),
  };
  const flatMap = <FlatMap {...mapProps} />;

  return (
    <section>
      <h1 className="text-2xl font-semibold">{t('map.title', 'Map')}</h1>

      <div className="mt-3">
        {use3D ? (
          <MapErrorBoundary fallback={flatMap} onFail={() => setUse3D(false)}>
            <Suspense fallback={flatMap}>
              <CityMap3D {...mapProps} />
            </Suspense>
          </MapErrorBoundary>
        ) : (
          flatMap
        )}
      </div>

      <MapLegend showCity={Boolean(use3D)} showYou={Boolean(position)} />

      {locationOn ? null : (
        <p role="status" className="mt-3 text-sm text-slate-500">
          {t('map.locationOff', "Location is off, so we can't show where you are.")}
        </p>
      )}

      {use3D ? <MapAttribution className="mt-2" /> : null}
    </section>
  );
}
