/**
 * Journey screen (task S5, docs/PLAN.md flow F4).
 *
 * One hand-written route card as a checklist. The visitor taps "I'm Here" on
 * each step; the step they are on is saved, so closing the app and coming back
 * returns them to the same place.
 *
 * Only the last step asks for GPS: it opens the Check-in screen (Faris's
 * screen) for the place the card ends at. Every other step advances on the tap
 * alone, because GPS is weak inside stations and on trains.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getLine, getPlace, getRoute } from '@/data';
import { getProgress, onProgressChange, setJourneyStep } from '@/core/progress';
import Button from '@/shared/Button';
import Card from '@/shared/Card';
import StepIcon from './components/StepIcon';
import { currentStepIndex, imHereAction, isJourneyFinished, stepState } from './journeySteps';
import { shortNameKey } from './placeList';

/** The extra facts under a step's sentence: line, platform, stops. */
function StepFacts({ step }) {
  const { t } = useTranslation();
  const line = step.line ? getLine(step.line) : null;
  const facts = [];

  if (line) {
    facts.push(
      <span key="line" className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          style={{ backgroundColor: step.lineColour || line.colour }}
          className="inline-block size-2.5 rounded-full"
        />
        {t(line.nameKey)}
      </span>,
    );
  }
  if (step.at) facts.push(<span key="at">{t('journey.boardAt', { station: step.at })}</span>);
  if (step.towards) {
    facts.push(<span key="towards">{t('journey.towards', { station: step.towards })}</span>);
  }
  if (Number.isFinite(step.stops)) {
    facts.push(<span key="stops">{t('journey.stops', { count: step.stops })}</span>);
  }
  if (step.alightAt) {
    facts.push(<span key="alight">{t('journey.alightAt', { station: step.alightAt })}</span>);
  }

  if (facts.length === 0) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">{facts}</span>
  );
}

export default function JourneyScreen() {
  const { routeId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const route = useMemo(() => getRoute(routeId), [routeId]);
  const [progress, setProgress] = useState(getProgress);

  useEffect(() => onProgressChange(setProgress), []);

  if (!route) {
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

  const steps = route.steps;
  const current = currentStepIndex(progress.journeys[route.id]?.stepIndex, steps.length);
  const finished = isJourneyFinished(steps, current, progress.stamps);
  const destination = getPlace(route.to);

  function imHere(step, index) {
    const action = imHereAction(step, index);
    if (action.kind === 'checkin') navigate(action.to);
    else setJourneyStep(route.id, action.stepIndex);
  }

  return (
    <section className="pb-4">
      <p className="text-sm text-slate-500">{t('journey.title', 'Your route')}</p>
      <h1 className="text-2xl font-semibold">
        {destination ? t(shortNameKey(destination), t(destination.nameKey)) : route.to}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {t(`journey.mode.${route.mode}`, '')}
        {Number.isFinite(route.totalMinutes)
          ? ` · ${t('journey.total', { count: route.totalMinutes })}`
          : ''}
      </p>

      <Card className="mt-4">
        <h2 className="font-medium">{t('journey.why', 'Why this way')}</h2>
        <p className="mt-1 text-sm text-slate-700">{t(route.why)}</p>
      </Card>

      {current > 0 && !finished ? (
        <p role="status" className="mt-4 text-sm text-teal-700">
          {t('journey.resume', 'Pick up where you left off')}
        </p>
      ) : null}

      <p className="mt-4 text-sm text-slate-500">
        {t('journey.stepOf', {
          current: Math.min(current + 1, steps.length),
          total: steps.length,
        })}
      </p>

      <ol className="mt-2 space-y-3">
        {steps.map((step, index) => {
          const state = stepState(index, current);
          const done = state === 'done';
          const now = state === 'now';
          return (
            <li key={step.textKey}>
              <Card
                className={[
                  'flex gap-3',
                  now ? 'border-teal-700' : '',
                  state === 'later' ? 'opacity-60' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="shrink-0 pt-0.5">
                  <StepIcon
                    type={step.type}
                    colour={now || done ? step.lineColour : undefined}
                    className={done ? 'text-slate-400' : 'text-slate-700'}
                  />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium tracking-wide text-slate-500 uppercase">
                    {t(`journey.stepType.${step.type}`, '')}
                  </span>
                  <span className={`block ${done ? 'text-slate-500 line-through' : ''}`}>
                    {t(step.textKey)}
                  </span>
                  <StepFacts step={step} />

                  {/* Signage photos arrive with task D7. Steps without one show no picture. */}
                  {step.photo ? (
                    <img
                      src={step.photo}
                      alt=""
                      loading="lazy"
                      className="mt-2 w-full rounded-lg object-cover"
                    />
                  ) : null}

                  {now ? (
                    <Button
                      size="lg"
                      fullWidth
                      className="mt-3"
                      onClick={() => imHere(step, index)}
                    >
                      {t('ui.imHere', "I'm Here")}
                    </Button>
                  ) : null}
                </span>
              </Card>
            </li>
          );
        })}
      </ol>

      {finished ? (
        <Card className="mt-4">
          <h2 className="font-medium">{t('journey.finished', 'You made it!')}</h2>
          <div className="mt-3 flex flex-col gap-2">
            {destination ? (
              <Button as={Link} to={`/place/${destination.id}`} fullWidth>
                {t(shortNameKey(destination), t(destination.nameKey))}
              </Button>
            ) : null}
            <Button as={Link} to="/" variant="secondary" fullWidth>
              {t('ui.goHome', 'Back to the guide')}
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="mt-6">
        <Button
          as="a"
          href={route.googleMapsUrl}
          target="_blank"
          rel="noreferrer"
          variant="secondary"
          fullWidth
        >
          {t('ui.openInGoogleMaps', 'Open in Google Maps')}
        </Button>
        <p className="mt-2 text-center text-sm text-slate-500">
          {t('journey.liveTimes', 'For live times, open Google Maps.')}
        </p>
      </div>
    </section>
  );
}
