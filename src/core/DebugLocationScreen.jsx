/**
 * Hidden developer page at /debug/location (not linked anywhere in the app).
 * Used for the F6 outdoor test: shows the live GPS reading and the distance to
 * a test point you choose. Always uses the REAL GPS, even with VITE_USE_MOCKS=true.
 *
 * English only on purpose: tourists never see this page.
 * The test point is kept in this phone's localStorage so it survives a reload.
 */
import { useEffect, useState } from 'react';
import { getPlaces } from '@/data';
import { metresBetween } from './geo';
import { distanceTo, getPermissionState, getPosition, watchPosition } from './real/location.real';

const TEST_POINT_KEY = 'jalankl-debug-test-point';

function loadTestPoint() {
  try {
    const p = JSON.parse(localStorage.getItem(TEST_POINT_KEY));
    return Number.isFinite(p?.lat) && Number.isFinite(p?.lng) ? p : null;
  } catch {
    return null;
  }
}

function saveTestPoint(point) {
  try {
    if (point) localStorage.setItem(TEST_POINT_KEY, JSON.stringify(point));
    else localStorage.removeItem(TEST_POINT_KEY);
  } catch {
    // Storage blocked: the point still works until the page is closed.
  }
}

const fmt = (n) => n.toFixed(6);

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-1">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-mono">{children}</span>
    </div>
  );
}

const buttonClass =
  'min-h-11 w-full rounded-lg border border-teal-700 px-4 font-medium text-teal-700 disabled:opacity-50';

export default function DebugLocationScreen() {
  const [permission, setPermission] = useState('…');
  const [live, setLive] = useState(null);
  const [liveCount, setLiveCount] = useState(0);
  const [watching, setWatching] = useState(false);
  const [best, setBest] = useState(null);
  const [bestMs, setBestMs] = useState(null);
  const [reading, setReading] = useState(false);
  const [testPoint, setTestPoint] = useState(loadTestPoint);
  const [typed, setTyped] = useState('');

  // Re-check permission when a reading succeeds or fails (the answer may have changed)
  const liveStatus = live ? String(live.ok) : 'none';
  useEffect(() => {
    getPermissionState().then(setPermission);
  }, [liveStatus, best]);

  useEffect(() => {
    if (!watching) return undefined;
    return watchPosition((position) => {
      setLive(position);
      setLiveCount((n) => n + 1);
    });
  }, [watching]);

  async function readBestOfThree() {
    setReading(true);
    const started = Date.now();
    setBest(await getPosition());
    setBestMs(Date.now() - started);
    setReading(false);
  }

  function keepTestPoint(point) {
    setTestPoint(point);
    saveTestPoint(point);
  }

  function setTypedPoint() {
    // Accepts "3.14861, 101.69444" as copied from Google Maps
    const [lat, lng] = typed.split(',').map((s) => Number(s.trim()));
    if (Number.isFinite(lat) && Number.isFinite(lng)) keepTestPoint({ lat, lng });
  }

  const liveOk = live?.ok ? live : null;

  return (
    <section className="space-y-6 text-sm">
      <div>
        <h1 className="text-2xl font-semibold">Location test</h1>
        <p className="text-slate-500">Developer page. Uses the real GPS.</p>
      </div>

      <div>
        <Row label="Permission">{permission}</Row>
        <Row label="Secure (https)">{String(globalThis.isSecureContext)}</Row>
      </div>

      <div className="space-y-2">
        <h2 className="font-medium">Live position</h2>
        <button type="button" className={buttonClass} onClick={() => setWatching((w) => !w)}>
          {watching ? 'Stop live GPS' : 'Start live GPS'}
        </button>
        {live && !live.ok && <Row label="Problem">{live.reason}</Row>}
        {liveOk && (
          <div>
            <Row label="Latitude">{fmt(liveOk.lat)}</Row>
            <Row label="Longitude">{fmt(liveOk.lng)}</Row>
            <Row label="Accuracy">{liveOk.accuracy_m} m</Row>
            <Row label="Readings">{liveCount}</Row>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="font-medium">Test point</h2>
        {testPoint ? (
          <div>
            <Row label="Point">
              {fmt(testPoint.lat)}, {fmt(testPoint.lng)}
            </Row>
            <Row label="Distance now">
              {liveOk
                ? `${metresBetween([testPoint.lat, testPoint.lng], [liveOk.lat, liveOk.lng])} m (±${liveOk.accuracy_m} m)`
                : 'start live GPS'}
            </Row>
          </div>
        ) : (
          <p className="text-slate-500">No test point yet.</p>
        )}
        <button
          type="button"
          className={buttonClass}
          disabled={!liveOk}
          onClick={() => keepTestPoint({ lat: liveOk.lat, lng: liveOk.lng })}
        >
          Save this spot as my test point
        </button>
        <div className="flex gap-2">
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="or paste: 3.14861, 101.69444"
            className="min-h-11 flex-1 rounded-lg border border-slate-300 px-3"
          />
          <button type="button" className="rounded-lg border px-3" onClick={setTypedPoint}>
            Set
          </button>
        </div>
        {testPoint && (
          <button
            type="button"
            className="text-red-700 underline"
            onClick={() => keepTestPoint(null)}
          >
            Clear test point
          </button>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="font-medium">Check-in style reading</h2>
        <p className="text-slate-500">
          Best of 3 readings within 10 seconds, as check-in will use.
        </p>
        <button type="button" className={buttonClass} disabled={reading} onClick={readBestOfThree}>
          {reading ? 'Reading… (up to 10 s)' : 'Take best-of-3 reading'}
        </button>
        {best && (
          <div>
            {best.ok ? (
              <>
                <Row label="Position">
                  {fmt(best.lat)}, {fmt(best.lng)}
                </Row>
                <Row label="Accuracy">{best.accuracy_m} m</Row>
              </>
            ) : (
              <Row label="Problem">{best.reason}</Row>
            )}
            <Row label="Took">{(bestMs / 1000).toFixed(1)} s</Row>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h2 className="font-medium">Distance to check-in spots</h2>
        {getPlaces().map((place) => {
          const d = liveOk ? distanceTo(place.id, liveOk) : null;
          return (
            <Row key={place.id} label={place.id}>
              {place.coords
                ? d === null
                  ? '—'
                  : `${d} m (radius ${place.radius_m} m)`
                : 'no coords yet'}
            </Row>
          );
        })}
      </div>
    </section>
  );
}
