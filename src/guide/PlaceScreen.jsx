/**
 * Landmark detail (task S4, docs/PLAN.md flow F3 and F4).
 *
 * The photo, the story, the opening-hours note, and the one button that
 * matters: "Take me there". Opening this screen marks the place as opened,
 * which gives an outline stamp if there is no stamp yet.
 *
 * The route card comes from the nearest starting point we have written a card
 * for (see routePicker.js). If there is none, the screen offers Google Maps
 * instead, as flow F4 says.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getPlace, getRoutesTo } from '@/data';
import { getProgress, markOpened, onProgressChange } from '@/core/progress';
import { distanceTo, getPermissionState, getPosition } from '@/core/location';
import Button from '@/shared/Button';
import StampBadge from '@/shared/StampBadge';
import { formatDistance, stampKind } from './placeList';
import { googleMapsUrl, pickRoute } from './routePicker';

export default function PlaceScreen() {
  const { id } = useParams();
  const { t } = useTranslation();
  const place = useMemo(() => getPlace(id), [id]);
  const [stamps, setStamps] = useState(() => getProgress().stamps);
  const [position, setPosition] = useState(null);

  // Listen first, then mark: markOpened() tells the listeners straight away,
  // and we want this screen's badge to be one of them.
  useEffect(() => onProgressChange((progress) => setStamps(progress.stamps)), []);

  // Opening the story is worth an outline stamp (docs/PLAN.md section 8).
  useEffect(() => {
    if (place) markOpened(place.id);
  }, [place]);

  // Only read GPS if the visitor has already allowed it. This screen never
  // asks: the Guide home and the Check-in screen do the asking.
  useEffect(() => {
    let active = true;
    getPermissionState().then(async (state) => {
      if (!active || state !== 'granted') return;
      const reading = await getPosition({ readings: 1 });
      if (active && reading.ok) setPosition(reading);
    });
    return () => {
      active = false;
    };
  }, []);

  const routes = useMemo(() => (place ? getRoutesTo(place.id) : []), [place]);

  // How far the visitor is from each place a route card starts at.
  const startDistances = useMemo(() => {
    if (!position) return {};
    return Object.fromEntries(routes.map((r) => [r.from, distanceTo(r.from, position)]));
  }, [routes, position]);

  const route = useMemo(() => pickRoute(routes, startDistances), [routes, startDistances]);

  if (!place) {
    return (
      <section>
        <h1 className="text-2xl font-semibold">
          {t('ui.notFound', "We couldn't find that page.")}
        </h1>
        <Link to="/" className="mt-4 inline-flex min-h-11 items-center font-medium text-teal-700">
          {t('ui.goHome', 'Back to the guide')}
        </Link>
      </section>
    );
  }

  const kind = stampKind(stamps[place.id]);
  const distance = formatDistance(t, position ? distanceTo(place.id, position) : null);
  const mapsUrl = googleMapsUrl(place);

  return (
    <section className="pb-4">
      {/* The landmark photos arrive with task D10. Until then this is a plain block. */}
      <div
        aria-hidden="true"
        style={place.photo ? { backgroundImage: `url(${place.photo})` } : undefined}
        className="aspect-video w-full rounded-2xl bg-slate-100 bg-cover bg-center"
      />

      <div className="mt-4 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">{t(place.nameKey)}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {t(`categories.${place.category}`, '')}
            {distance ? ` · ${distance}` : ''}
          </p>
        </div>
        <StampBadge kind={kind} size="md" label={t(`ui.stamp.${kind}`)} className="shrink-0" />
      </div>

      <div className="mt-5 space-y-3">
        {route ? (
          <Button as={Link} to={`/journey/${route.id}`} size="lg" fullWidth>
            {t('ui.takeMeThere', 'Take me there')}
          </Button>
        ) : (
          <p className="text-sm text-slate-600">
            {t(
              'place.noRoute',
              "We don't have step-by-step directions from here yet. Google Maps can show you the way.",
            )}
          </p>
        )}

        {mapsUrl ? (
          <Button
            as="a"
            href={route?.googleMapsUrl || mapsUrl}
            target="_blank"
            rel="noreferrer"
            variant="secondary"
            size="lg"
            fullWidth
          >
            {t('ui.openInGoogleMaps', 'Open in Google Maps')}
          </Button>
        ) : null}
      </div>

      <h2 className="mt-8 font-medium">{t('place.story', 'The story')}</h2>
      <p className="mt-1 whitespace-pre-line text-slate-700">{t(place.storyKey)}</p>

      <h2 className="mt-6 font-medium">{t('place.hours', 'Opening hours')}</h2>
      <p className="mt-1 whitespace-pre-line text-slate-700">{t(place.hoursKey)}</p>

      {kind === 'gold' ? null : (
        <p className="mt-6 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
          {t('place.stampHint', 'Check in here with GPS to earn a gold stamp.')}
        </p>
      )}
    </section>
  );
}
