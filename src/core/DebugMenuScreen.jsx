/**
 * Hidden developer menu at /debug (not linked anywhere in the app).
 * Opens the Check-in screen forced into any state (task F7), links to the
 * other test pages, and loads or clears sample stamps.
 *
 * English only on purpose: tourists never see this page.
 */
import { useState } from 'react';
import { Link } from 'react-router';
import { getPlaces } from '@/data';
import { CHECKIN_STATES } from './checkinStates';
import { addStamp, markOpened, resetProgress, setJourneyStep } from './progress';
import { USE_MOCKS } from './useMocks';
import ConsentCheckbox from './ConsentCheckbox';

const linkClass =
  'flex min-h-11 items-center rounded-lg border border-slate-200 px-3 font-medium text-teal-700';

/** Same sample data as jalankl.loadSampleProgress() in the console. */
function loadSampleStamps() {
  resetProgress();
  markOpened('petaling-street');
  addStamp('abdul-samad', 'gold', 18);
  setJourneyStep('kl-sentral__petronas', 2);
}

export default function DebugMenuScreen() {
  const places = getPlaces();
  const [placeId, setPlaceId] = useState('abdul-samad');
  const [note, setNote] = useState('');
  const [consent, setConsent] = useState(false);

  return (
    <section className="space-y-8 text-sm">
      <div>
        <h1 className="text-2xl font-semibold">Debug menu</h1>
        <p className="text-slate-500">
          Developer page. Fake functions: <b>{USE_MOCKS ? 'on' : 'off'}</b>
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="font-medium">Check-in screen (F7)</h2>
        <label className="block">
          <span className="text-slate-500">Landmark</span>
          <select
            value={placeId}
            onChange={(e) => setPlaceId(e.target.value)}
            className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 px-3"
          >
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id}
                {p.coords ? '' : ' (no coords yet)'}
              </option>
            ))}
          </select>
        </label>
        <p className="text-slate-500">Show a state (no GPS, nothing saved):</p>
        <div className="grid grid-cols-2 gap-2">
          {CHECKIN_STATES.map((state) => (
            <Link key={state} to={`/checkin/${placeId}?debug=${state}`} className={linkClass}>
              {state}
            </Link>
          ))}
        </div>
        <Link to={`/checkin/${placeId}`} className={`${linkClass} justify-center bg-teal-50`}>
          Real check-in at {placeId}
        </Link>
      </div>

      <div className="space-y-2">
        <h2 className="font-medium">Stamps</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={linkClass}
            onClick={() => {
              loadSampleStamps();
              setNote('Sample stamps loaded.');
            }}
          >
            Load sample stamps
          </button>
          <button
            type="button"
            className={linkClass}
            onClick={() => {
              resetProgress();
              setNote('Progress reset.');
            }}
          >
            Reset progress
          </button>
        </div>
        {note && <p className="text-teal-700">{note}</p>}
      </div>

      <div className="space-y-2">
        <h2 className="font-medium">Consent tick box (F12, for the Review form)</h2>
        <ConsentCheckbox checked={consent} onChange={setConsent} />
        <p className="text-slate-500">Ticked: {String(consent)}</p>
      </div>

      <div className="space-y-2">
        <h2 className="font-medium">Other test pages</h2>
        <Link to="/debug/location" className={linkClass}>
          GPS test (F6)
        </Link>
        <Link to="/debug/components" className={linkClass}>
          Shared components (S1)
        </Link>
      </div>
    </section>
  );
}
