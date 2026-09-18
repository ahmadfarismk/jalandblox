/**
 * "Your route at a glance": every leg of the route card in one row, like
 * Walk → [KJ LRT Kelana Jaya Line] 5 stops → Walk → the landmark.
 *
 * @param {object} props
 * @param {{ steps: object[] }} props.route from getRoute()
 * @param {object|null} props.destination from getPlace(route.to)
 * @param {boolean} [props.gold] true once the destination has a gold stamp
 */
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { getLine } from '@/data';
import { routeLegs } from '../routeLegs';
import { shortNameKey } from '../placeList';
import LineBadge from './LineBadge';
import StepIcon from './StepIcon';

function Leg({ leg }) {
  const { t } = useTranslation();
  if (leg.type === 'line') {
    const line = getLine(leg.line);
    if (!line) return null;
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <LineBadge line={line} size="sm" />
        {Number.isFinite(leg.stops) ? (
          <span className="text-xs font-medium text-slate-600">
            {t('journey.stops', { count: leg.stops })}
          </span>
        ) : null}
      </span>
    );
  }
  const label = leg.type === 'car' ? t('journey.mode.car') : t('journey.stepType.walk');
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
      <StepIcon type={leg.type === 'car' ? 'ride' : 'walk'} className="size-4" />
      {label}
    </span>
  );
}

export default function RouteSummary({ route, destination, gold = false }) {
  const { t } = useTranslation();
  const legs = routeLegs(route.steps);
  if (legs.length === 0) return null;

  return (
    <div className="mt-4 rounded-2xl bg-slate-50 p-3">
      <h2 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {t('journey.atAGlance')}
      </h2>
      <ol className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-2">
        {legs.map((leg, i) => (
          <Fragment key={i}>
            <li className="inline-flex">
              <Leg leg={leg} />
            </li>
            <li aria-hidden="true" className="text-slate-400">
              →
            </li>
          </Fragment>
        ))}
        {destination ? (
          <li className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <img
              src={gold ? destination.iconColour : destination.iconGrey}
              alt=""
              className="size-8 object-contain"
            />
            {t(shortNameKey(destination), t(destination.nameKey))}
          </li>
        ) : null}
      </ol>
    </div>
  );
}
