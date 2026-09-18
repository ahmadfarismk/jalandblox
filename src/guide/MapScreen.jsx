/**
 * Map screen (task S7, docs/PLAN.md section 4).
 *
 * An overview of the City Centre with the seven check-in spots on it. Each
 * icon is grey until its gold stamp is earned, then it turns gold, and it does
 * that live: the screen listens for progress changes (task S8). Tapping an
 * icon opens the landmark.
 *
 * Two things wait on decisions the team has not made yet:
 *
 * - No street tiles. The plan's map library (MapLibre GL JS) needs a hosted
 *   tile service, and which one to use is still an open question (docs/PLAN.md
 *   section 16). Until then this screen draws the landmarks itself from their
 *   real coordinates, so they sit in the right places relative to each other.
 * - No tilt. Tilting this drawn map in CSS squashed the icons to about 30px
 *   tall, under the 44px a thumb needs, and pushed the ones at the edge out of
 *   view. The tilt belongs to the map library, and the plan already lists it
 *   as the first thing to cut (section 12).
 *
 * When the team picks a tile service, this screen is the only file to change.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getPlaces } from '@/data';
import { getProgress, onProgressChange } from '@/core/progress';
import { getPermissionState, watchPosition } from '@/core/location';
import MapPin from './components/MapPin';
import { boundsFor, fitToBox, projectPoint } from './mapProjection';
import { isCollected, newlyGold, shortNameKey } from './placeList';

export default function MapScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stamps, setStamps] = useState(() => getProgress().stamps);
  const [position, setPosition] = useState(null);
  const [locationOn, setLocationOn] = useState(true);

  /** Places whose icon has just turned gold, so the map can mark the change. */
  const [justUnlocked, setJustUnlocked] = useState([]);
  const stampsRef = useRef(stamps);

  // Gold stamps colour the icons in, with no reload (task S8). A check-in on
  // another screen, or in another tab, arrives here the same way.
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

  // How wide the drawing area is against its height. The landmarks are placed
  // inside it in percentages, so without this the city would be stretched to
  // fill a tall phone screen.
  const boxRef = useRef(null);
  const [aspect, setAspect] = useState(null);
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    const measure = () => setAspect(box.clientWidth / box.clientHeight || null);
    measure();
    // The box changes with the window, and when the phone is turned sideways.
    const observer = new globalThis.ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // The map fits every landmark, and the visitor too when they are nearby.
  const bounds = useMemo(() => {
    const points = places.map((p) => p.coords);
    if (position) points.push([position.lat, position.lng]);
    // A wider margin than the default: a pin's name sticks out sideways.
    return fitToBox(boundsFor(points, 0.25), aspect);
  }, [places, position, aspect]);

  const you = position ? projectPoint([position.lat, position.lng], bounds) : null;

  return (
    <section>
      <h1 className="text-2xl font-semibold">{t('map.title', 'Map')}</h1>

      {/* Flat for now, not tilted: see the note at the top of this file. The
          inner box is inset, so a pin near the edge still has room for its
          name instead of being cut off. */}
      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        {/* The City Centre is a little wider than it is tall, so the box is
            too: fitting a tall box would only add empty sky and squash the
            landmarks into a band across the middle. */}
        <div className="relative aspect-[6/5] w-full">
          <div ref={boxRef} className="absolute inset-x-12 inset-y-10">
            {places.map((place) => {
              const at = projectPoint(place.coords, bounds);
              if (!at) return null; // coordinates still TBC
              const collected = isCollected(stamps[place.id]);
              return (
                <MapPin
                  key={place.id}
                  name={t(shortNameKey(place), t(place.nameKey))}
                  collected={collected}
                  justUnlocked={justUnlocked.includes(place.id)}
                  icon={collected ? place.iconColour : place.iconGrey}
                  at={at}
                  onSelect={() => navigate(`/place/${place.id}`)}
                />
              );
            })}

            {you ? (
              <span
                style={{ left: `${you.left}%`, top: `${you.top}%` }}
                className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-teal-600 shadow"
              >
                <span className="sr-only">{t('map.you', 'You are here')}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-3 rounded-full border border-slate-400 bg-white"
          />
          {t('map.legendGrey', 'Not collected yet')}
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-3 rounded-full border border-amber-600 bg-amber-400"
          />
          {t('map.legendColour', 'Gold stamp collected')}
        </li>
        {you ? (
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="size-3 rounded-full bg-teal-600" />
            {t('map.you', 'You are here')}
          </li>
        ) : null}
      </ul>

      {locationOn ? null : (
        <p role="status" className="mt-3 text-sm text-slate-500">
          {t('map.locationOff', "Location is off, so we can't show where you are.")}
        </p>
      )}
    </section>
  );
}
