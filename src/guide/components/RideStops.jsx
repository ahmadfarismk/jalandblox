/**
 * The ride on one line, drawn like the strip map above a train door: a bar in
 * the line's colour with a dot for each stop, where you get on at the left and
 * get off at the right.
 *
 * @param {object} props
 * @param {string} props.colour the line colour
 * @param {string|null} props.from station where you board
 * @param {string|null} props.to station where you get off
 * @param {number|null} props.stops how many stops you ride
 */
import { useTranslation } from 'react-i18next';

// Past this many stops the dots get too tight on a small phone.
const MAX_DOTS = 10;

export default function RideStops({ colour, from, to, stops }) {
  const { t } = useTranslation();
  if (!from && !to) return null;
  const dots = Number.isFinite(stops) ? Math.min(stops, MAX_DOTS) + 1 : 2;

  return (
    <span className="mt-3 block" aria-hidden="true">
      <span className="relative flex h-4 items-center justify-between">
        <span
          className="absolute inset-x-1 top-1/2 h-1.5 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: colour }}
        />
        {Array.from({ length: dots }, (_, i) => {
          const end = i === 0 || i === dots - 1;
          return (
            <span
              key={i}
              className={`relative rounded-full bg-white ${end ? 'size-4 border-[3px]' : 'size-2.5 border-2'}`}
              style={{ borderColor: colour }}
            />
          );
        })}
      </span>
      <span className="mt-1.5 flex justify-between gap-3 text-xs font-medium text-slate-700">
        <span className="min-w-0">{from}</span>
        {Number.isFinite(stops) ? (
          <span className="shrink-0 text-slate-500">{t('journey.stops', { count: stops })}</span>
        ) : null}
        <span className="min-w-0 text-right">{to}</span>
      </span>
    </span>
  );
}
