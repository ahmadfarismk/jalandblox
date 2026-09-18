/**
 * Check-in screen at /checkin/:id (task F7). Opened from the last Journey step.
 * States follow the diagram in docs/PLAN.md section 10.
 *
 * Debug: /checkin/:id?debug=<state> shows a state without GPS and without
 * saving anything. The debug menu at /debug links to every state.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getPlace } from '@/data';
import Button from '@/shared/Button';
import StampBadge from '@/shared/StampBadge';
import { checkIn } from './checkin';
import { getPermissionState } from './location';
import { addStamp } from './progress';
import LocationExplainer from './LocationExplainer';
import { CHECKIN_STATES } from './checkinStates';

/** Sample numbers for forced states, so the text reads naturally. */
const DEBUG_ANSWER = { distance_m: 240, accuracy_m: 65 };

function Result({ badge, title, body, extra, children }) {
  return (
    <div className="space-y-6 text-center">
      {badge && (
        <div className="flex justify-center">
          <StampBadge kind={badge} size="lg" />
        </div>
      )}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-slate-600">{body}</p>
        {extra && <p className="text-sm text-slate-500">{extra}</p>}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Checkin() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const forced = CHECKIN_STATES.includes(searchParams.get('debug'))
    ? searchParams.get('debug')
    : null;
  const { t } = useTranslation();
  const place = getPlace(id);

  /** 'starting' until we know the permission, then one of CHECKIN_STATES */
  const [state, setState] = useState(forced ?? 'starting');
  const [answer, setAnswer] = useState(forced ? DEBUG_ANSWER : {});

  const run = useCallback(async () => {
    if (forced) return; // debug mode never reads GPS or saves stamps
    setState('reading');
    const result = await checkIn(id);
    setAnswer(result);
    setState(result.result);
  }, [forced, id]);

  // On open: ask straight away if location is already allowed,
  // otherwise explain first (section 10: "Explainer before asking").
  useEffect(() => {
    if (forced || !place) return undefined;
    let active = true;
    getPermissionState().then((permission) => {
      if (!active) return;
      if (permission === 'prompt') setState('asking');
      else if (permission === 'denied') setState('no_permission');
      else run();
    });
    return () => {
      active = false;
    };
  }, [forced, place, run]);

  function continueWithoutGps() {
    if (!forced) addStamp(id, 'outline');
    setState('outline');
  }

  if (!place) {
    return (
      <Result title={t('checkin.error.title')} body={t('checkin.unknownPlace')}>
        <Button as={Link} to="/" variant="secondary" fullWidth>
          {t('checkin.toGuide')}
        </Button>
      </Result>
    );
  }

  const placeName = t(place.nameKey);
  const tryAgain = (
    <Button fullWidth size="lg" onClick={run}>
      {t('checkin.tryAgain')}
    </Button>
  );
  const toPassport = (
    <Button as={Link} to="/passport" fullWidth size="lg">
      {t('checkin.toPassport')}
    </Button>
  );
  const toGuide = (
    <Button as={Link} to="/" variant="secondary" fullWidth>
      {t('checkin.toGuide')}
    </Button>
  );

  let body;
  switch (state) {
    case 'starting':
      body = null;
      break;
    case 'asking':
      // The explainer's button makes the phone ask; then we check in.
      body = <LocationExplainer onResult={run} alwaysShow={Boolean(forced)} />;
      break;
    case 'reading':
      body = (
        <div role="status" className="space-y-4 py-8 text-center">
          <Button busy variant="quiet" className="pointer-events-none">
            {t('checkin.reading')}
          </Button>
          <p className="text-sm text-slate-500">{t('checkin.readingHint')}</p>
        </div>
      );
      break;
    case 'gold':
      body = (
        <Result
          badge="gold"
          title={t('checkin.gold.title')}
          body={t('checkin.gold.body', { place: placeName })}
        >
          {toPassport}
          {toGuide}
        </Result>
      );
      break;
    case 'too_far':
      body = (
        <Result
          title={t('checkin.too_far.title')}
          body={t('checkin.too_far.body', { distance: answer.distance_m, radius: place.radius_m })}
        >
          {tryAgain}
          {toGuide}
        </Result>
      );
      break;
    case 'poor_signal':
      body = (
        <Result
          title={t('checkin.poor_signal.title')}
          body={t('checkin.poor_signal.body')}
          extra={
            answer.accuracy_m
              ? t('checkin.poor_signal.accuracy', { accuracy: answer.accuracy_m })
              : null
          }
        >
          {tryAgain}
          {toGuide}
        </Result>
      );
      break;
    case 'no_permission':
      body = (
        <Result title={t('checkin.no_permission.title')} body={t('checkin.no_permission.body')}>
          <Button fullWidth size="lg" onClick={continueWithoutGps}>
            {t('checkin.no_permission.continue')}
          </Button>
          <Button fullWidth variant="secondary" onClick={run}>
            {t('checkin.tryAgain')}
          </Button>
        </Result>
      );
      break;
    case 'outline':
      body = (
        <Result badge="outline" title={t('checkin.outline.title')} body={t('checkin.outline.body')}>
          {toPassport}
          {toGuide}
        </Result>
      );
      break;
    case 'too_soon':
      body = (
        <Result title={t('checkin.too_soon.title')} body={t('checkin.too_soon.body')}>
          {tryAgain}
          {toGuide}
        </Result>
      );
      break;
    default:
      body = (
        <Result title={t('checkin.error.title')} body={t('checkin.error.body')}>
          {tryAgain}
          {toGuide}
        </Result>
      );
  }

  return (
    <section className="space-y-6">
      {forced && (
        <p className="rounded-lg bg-amber-100 px-3 py-2 font-mono text-xs text-amber-900">
          DEBUG: showing “{forced}”. No GPS, nothing saved.
        </p>
      )}
      <h1 className="text-2xl font-semibold">{placeName}</h1>
      {body}
    </section>
  );
}

/** Starts fresh whenever the landmark or the forced debug state changes. */
export default function CheckinScreen() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  return <Checkin key={`${id}|${searchParams.get('debug') ?? ''}`} />;
}
