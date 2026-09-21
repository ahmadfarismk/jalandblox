/**
 * The flat map (task S7, split out of MapScreen in S12).
 *
 * The seven landmarks drawn from their real coordinates, so they sit in the
 * right places relative to each other. No street tiles and no tilt: this is
 * the map the app has always had, and it is now the fallback for phones that
 * cannot draw the 3D scene, and for anyone who picks the simple map in
 * Settings.
 *
 * It keeps working with no signal, which the 3D scene's models cannot promise
 * on a first visit.
 *
 * @param {object} props
 * @param {import('@/data').Place[]} props.places
 * @param {Record<string, object>} props.stamps      from getProgress().stamps
 * @param {string[]} props.justUnlocked              ids whose stamp just turned gold
 * @param {{lat: number, lng: number} | null} props.position
 * @param {(placeId: string) => void} props.onSelect
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MapPin from './MapPin';
import { boundsFor, fitToBox, projectPoint } from '../mapProjection';
import { isCollected, shortNameKey } from '../placeList';

export default function FlatMap({ places, stamps, justUnlocked, position, onSelect }) {
  const { t } = useTranslation();

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
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      {/* The City Centre is a little wider than it is tall, so the box is
          too: fitting a tall box would only add empty sky and squash the
          landmarks into a band across the middle. */}
      <div className="relative aspect-[6/5] w-full">
        {/* Inset, so a pin near the edge still has room for its name. */}
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
                onSelect={() => onSelect(place.id)}
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
  );
}
