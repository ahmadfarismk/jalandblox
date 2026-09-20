/**
 * Hidden developer page at /debug/nearby (not linked anywhere in the app).
 *
 * Task X1: a spike to judge whether Geoapify could power a SECOND tier of
 * places across KL — search, things to see, places to eat, places to stay.
 * It is deliberately not wired into the Guide, the Map, the Passport, check-in
 * or stamps. Nothing on this page gives a stamp or a route card.
 *
 * English only on purpose: tourists never see this page.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/shared/Button';
import Card from '@/shared/Card';
import { getPosition } from '@/core/location';
import { getPlace } from '@/data';
import { GROUPS, GROUP_IDS } from './nearby/categories';
import { getFakeFailure, setFakeFailure } from './nearby/geoapify.mock';
import {
  clearCache,
  defaultSource,
  getCacheSize,
  getNearbyPlaces,
  getRequestCount,
  searchPlaces,
  sourceReady,
} from './nearby/nearbySource';
import { matchOursByName, mergeOursFirst, ourPlacesAsResults, oursNear } from './nearby/ourPlaces';

const RADIUS_CHOICES = [300, 500, 1000, 2000, 3000];

/** Start on one of our own landmarks, so the page works indoors with no GPS. */
const START = getPlace('abdul-samad')?.coords ?? null;

/** Typing fewer than this many letters searches nothing, to save credits. */
const MIN_SEARCH_LETTERS = 3;
const DEBOUNCE_MS = 400;

const PROBLEMS = {
  no_key: 'No API key. Put VITE_GEOAPIFY_KEY in your .env and restart npm run dev.',
  network: 'Could not reach Geoapify. The connection is down, or the request was blocked.',
  bad_key:
    'Geoapify refused the key (401/403). It is wrong, expired, or restricted to another site.',
  rate_limited:
    'Too many requests (429). The free plan allows 3,000 credits a day and 5 requests a second.',
  server: 'Geoapify had a problem at their end (5xx). Try again in a moment.',
  bad_answer: 'Geoapify sent something that is not JSON.',
  error: 'Something else went wrong.',
};

const FAKE_FAILURES = ['network', 'bad_key', 'rate_limited', 'server', 'no_results'];

function metres(value) {
  if (value === null || value === undefined) return '—';
  return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${Math.round(value)} m`;
}

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-1">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-mono break-all">{children}</span>
    </div>
  );
}

function Chip({ active, children, ...props }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={[
        'min-h-11 flex-1 rounded-lg border px-3 font-medium',
        active ? 'border-teal-700 bg-teal-50 text-teal-800' : 'border-slate-300 text-slate-700',
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}

export default function DebugNearbyScreen() {
  const { t } = useTranslation();

  const [source, setSource] = useState(defaultSource);
  const [group, setGroup] = useState('see');
  const [radius, setRadius] = useState(1000);
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [point, setPoint] = useState(() => (START ? { lat: START[0], lng: START[1] } : null));
  const [pointNote, setPointNote] = useState('Start point: our Sultan Abdul Samad coordinates.');
  const [typedPoint, setTypedPoint] = useState('');
  const [locating, setLocating] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [reloads, setReloads] = useState(0);
  const [fakeFail, setFakeFail] = useState(() => getFakeFailure() ?? '');

  // Wait until typing stops before asking anything, so one search is one
  // request and not one per keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      const typed = text.trim();
      setQuery(typed.length >= MIN_SEARCH_LETTERS ? typed : '');
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [text]);

  const lat = point?.lat;
  const lng = point?.lng;

  // One line saying exactly what is being asked. The answer is kept with the
  // question it belongs to, so an old answer never shows next to a new question
  // and "Loading…" needs no state of its own.
  const question = query
    ? `search|${query}|${lat},${lng}|${source}|${reloads}`
    : `nearby|${group}|${lat},${lng}|${radius}|${source}|${reloads}`;

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
    const controller = new AbortController();
    let live = true;

    const ask = query
      ? searchPlaces(query, { lat, lng }, { source, signal: controller.signal })
      : getNearbyPlaces({ lat, lng, radius, group, source, signal: controller.signal });

    ask
      .then((result) => {
        if (live) setAnswer({ ...result, question });
      })
      .catch(() => {
        // The only thing that reaches here is our own abort on cleanup.
      });

    return () => {
      live = false;
      controller.abort();
    };
    // `question` already changes whenever any of these do.
  }, [question, query, lat, lng, radius, group, source]);

  const current = answer?.question === question ? answer : null;
  const busy = Boolean(point) && !current;

  const ours = useMemo(() => ourPlacesAsResults(t), [t]);

  const oursShown = useMemo(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    return query
      ? matchOursByName(ours, query, { lat, lng })
      : oursNear(ours, { lat, lng, radius, group });
  }, [ours, query, lat, lng, radius, group]);

  const items = useMemo(
    () => mergeOursFirst(oursShown, current?.ok ? current.items : []),
    [oursShown, current],
  );

  const selected = items.find((item) => item.id === selectedId) ?? null;

  const useMyLocation = useCallback(async () => {
    setLocating(true);
    const position = await getPosition({ readings: 1 });
    setLocating(false);
    if (position.ok) {
      setPoint({ lat: position.lat, lng: position.lng });
      setPointNote(`From GPS, accuracy ${position.accuracy_m} m.`);
    } else {
      setPointNote(`GPS said "${position.reason}". Type a point instead.`);
    }
  }, []);

  function applyTypedPoint() {
    // Accepts "3.14861, 101.69444" as copied from Google Maps
    const [a, b] = typedPoint.split(',').map((part) => Number(part.trim()));
    if (Number.isFinite(a) && Number.isFinite(b)) {
      setPoint({ lat: a, lng: b });
      setPointNote('Typed point.');
    } else {
      setPointNote('That did not look like "lat, lng".');
    }
  }

  function reload() {
    clearCache();
    setReloads((n) => n + 1);
  }

  function chooseFakeFailure(value) {
    setFakeFail(value);
    setFakeFailure(value);
    reload();
  }

  const real = source === 'geoapify';
  const ready = sourceReady(source);
  const problem = current && !current.ok ? current.reason : null;
  const nothing = current?.ok && items.length === 0;

  return (
    <section className="space-y-6 pb-10 text-sm">
      <div>
        <h1 className="text-2xl font-semibold">Nearby places test</h1>
        <p className="text-slate-500">
          Developer page, spike X1. Trying Geoapify as a second tier of places. Not connected to the
          Guide, the Map, the Passport or check-in.
        </p>
      </div>

      {/* Which data is on screen, and what it has cost so far */}
      <div
        className={[
          'rounded-xl border p-3',
          real ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50',
        ].join(' ')}
      >
        <p className="font-medium">
          Data on screen: {real ? 'REAL — live Geoapify' : 'FAKE — sample data, no network'}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Chip active={!real} onClick={() => setSource('fake')}>
            Fake
          </Chip>
          <Chip active={real} onClick={() => setSource('geoapify')}>
            Real
          </Chip>
        </div>
        <div className="mt-3">
          <Row label="Requests this session">{getRequestCount()}</Row>
          <Row label="Answers reused from cache">{getCacheSize()}</Row>
          <Row label="API key set">{sourceReady('geoapify') ? 'yes' : 'no'}</Row>
          <Row label=".env default">{defaultSource()}</Row>
        </div>
        <p className="mt-2 text-slate-500">
          Free plan: 3,000 credits a day, 20 places per credit, 5 requests a second. The same
          question is only ever asked once per session.
        </p>
        {real && !ready && (
          <p className="mt-2 font-medium text-red-700">
            No key set, so nothing can load. Add VITE_GEOAPIFY_KEY to your .env and restart.
          </p>
        )}
      </div>

      {/* Test point */}
      <div className="space-y-2">
        <h2 className="font-medium">Test point</h2>
        <div>
          <Row label="Latitude">{point ? point.lat.toFixed(6) : '—'}</Row>
          <Row label="Longitude">{point ? point.lng.toFixed(6) : '—'}</Row>
        </div>
        <p className="text-slate-500">{pointNote}</p>
        <Button variant="secondary" fullWidth busy={locating} onClick={useMyLocation}>
          Use my location
        </Button>
        <div className="flex gap-2">
          <input
            value={typedPoint}
            onChange={(e) => setTypedPoint(e.target.value)}
            placeholder="3.14861, 101.69444"
            inputMode="decimal"
            aria-label="Type a latitude and longitude"
            className="min-h-11 flex-1 rounded-lg border border-slate-300 px-3"
          />
          <Button variant="secondary" onClick={applyTypedPoint}>
            Use
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="space-y-2">
        <h2 className="font-medium">Search by name</h2>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type at least 3 letters"
          aria-label="Search places by name"
          className="min-h-11 w-full rounded-lg border border-slate-300 px-3"
        />
        {text.trim() && !query && (
          <p className="text-slate-500">
            Waiting for {MIN_SEARCH_LETTERS} letters. Nothing is sent until you stop typing.
          </p>
        )}
        {query && (
          <Button variant="quiet" onClick={() => setText('')}>
            Clear search and show nearby again
          </Button>
        )}
      </div>

      {/* Group and radius, only meaningful for the nearby list */}
      <div className={query ? 'space-y-3 opacity-50' : 'space-y-3'}>
        <div>
          <h2 className="font-medium">Group</h2>
          <div className="mt-2 flex gap-2">
            {GROUP_IDS.map((id) => (
              <Chip key={id} active={group === id} onClick={() => setGroup(id)}>
                {GROUPS[id].label}
              </Chip>
            ))}
          </div>
          <p className="mt-1 text-slate-500">{GROUPS[group].categories.join(', ')}</p>
        </div>
        <div>
          <h2 className="font-medium">Radius</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {RADIUS_CHOICES.map((value) => (
              <Chip key={value} active={radius === value} onClick={() => setRadius(value)}>
                {metres(value)}
              </Chip>
            ))}
          </div>
        </div>
        {query && <p className="text-slate-500">A search ignores the group and the radius.</p>}
      </div>

      {/* Pretend failures, so every error state can be seen without breaking anything */}
      {!real && (
        <div className="space-y-2">
          <h2 className="font-medium">Pretend something goes wrong</h2>
          <select
            value={fakeFail}
            onChange={(e) => chooseFakeFailure(e.target.value)}
            aria-label="Pretend failure"
            className="min-h-11 w-full rounded-lg border border-slate-300 px-3"
          >
            <option value="">Work normally</option>
            {FAKE_FAILURES.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* The detail of whatever was tapped */}
      {selected && (
        <Card className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">{selected.name}</h2>
            <p className="text-slate-500">
              {selected.ours
                ? 'One of our 7 landmarks (src/data)'
                : 'From Geoapify / OpenStreetMap'}
            </p>
          </div>
          <div>
            <Row label="Category">{selected.category ?? '—'}</Row>
            <Row label="All categories">{selected.allCategories.join(', ') || '—'}</Row>
            <Row label="Group">{selected.group ?? 'none of the three'}</Row>
            <Row label="Distance">{metres(selected.distance_m)}</Row>
            <Row label="Latitude">{selected.lat.toFixed(6)}</Row>
            <Row label="Longitude">{selected.lng.toFixed(6)}</Row>
            <Row label="Address">{selected.address ?? '—'}</Row>
            <Row label="id">{selected.id}</Row>
          </div>
          <p className="text-slate-500">
            OpenStreetMap has no ratings, no prices, no room availability, and halal status is
            rarely tagged, so this page shows none of those. Opening hours are not shown either:
            they are often missing or out of date.
          </p>
          <Button
            as="a"
            variant="secondary"
            fullWidth
            href={`https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lng}`}
            target="_blank"
            rel="noreferrer"
          >
            Open in Google Maps
          </Button>
          <Button variant="quiet" fullWidth onClick={() => setSelectedId(null)}>
            Close
          </Button>
        </Card>
      )}

      {/* The list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-medium">
            {query ? `Search: "${query}"` : `${GROUPS[group].label} within ${metres(radius)}`}
          </h2>
          <Button variant="quiet" onClick={reload}>
            Ask again
          </Button>
        </div>

        <p className="text-slate-500">
          {busy ? 'Loading…' : `${items.length} shown`}
          {current?.ok && current.fromCache ? ' · reused from cache, no request sent' : ''}
        </p>

        {problem && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-3">
            <p className="font-medium text-red-800">Request failed: {problem}</p>
            <p className="mt-1 text-red-800">{PROBLEMS[problem] ?? current.detail}</p>
            {current.safeUrl && (
              <p className="mt-2 font-mono text-xs break-all text-red-700">{current.safeUrl}</p>
            )}
            {oursShown.length > 0 && (
              <p className="mt-2 text-red-800">
                Our own {oursShown.length} landmark(s) below still work: they are in the app, not on
                the network.
              </p>
            )}
          </div>
        )}

        {nothing && (
          <div className="rounded-xl border border-slate-300 bg-slate-50 p-3">
            <p className="font-medium">Nothing came back.</p>
            <p className="mt-1 text-slate-600">
              {query
                ? 'No place in Malaysia matched that text.'
                : 'No place in this group inside the radius. Try a bigger radius or another group.'}
            </p>
          </div>
        )}

        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Card
                as="button"
                interactive
                onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {item.name}
                      {item.ours && (
                        <span className="ml-2 rounded bg-teal-100 px-1.5 py-0.5 text-xs font-medium text-teal-800">
                          ours
                        </span>
                      )}
                    </p>
                    <p className="truncate text-slate-500">{item.category ?? 'no category'}</p>
                  </div>
                  <span className="shrink-0 font-mono text-slate-600">
                    {metres(item.distance_m)}
                  </span>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </div>

      {/* Required by the data licence */}
      <footer className="border-t border-slate-200 pt-3 text-xs text-slate-500">
        <p>
          Place data from{' '}
          <a className="underline" href="https://www.openstreetmap.org/copyright">
            © OpenStreetMap contributors
          </a>
          , available under the{' '}
          <a className="underline" href="https://opendatacommons.org/licenses/odbl/">
            Open Database Licence
          </a>
          . Served by{' '}
          <a className="underline" href="https://www.geoapify.com/">
            Geoapify
          </a>
          .
        </p>
        <p className="mt-1">
          Our own 7 landmarks come from src/data and always rank first. Geoapify results never get a
          stamp, a route card or a check-in.
        </p>
      </footer>
    </section>
  );
}
