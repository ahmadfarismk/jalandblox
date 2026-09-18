import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import Button from '@/shared/Button';
import StampBadge from '@/shared/StampBadge';
import { formatDate } from '../format';
import LandmarkStamp from './LandmarkStamp';
import { SUN } from './stampTheme';

/**
 * One landmark in the passport: the postage stamp (empty, grey outline or full
 * colour), its name and date, and a review button once the stamp is gold.
 * @param {{ place: import('@/data').Place, stamp: {kind: string, at: string}|null, reviewed: boolean }} props
 */
export default function PassportStamp({ place, stamp, reviewed }) {
  const { t } = useTranslation();
  const kind = stamp?.kind === 'gold' || stamp?.kind === 'outline' ? stamp.kind : 'none';
  const status = t(`passport.status.${kind}`);
  const date = formatDate(stamp?.at, t('meta.dateLocale'));

  let detail = status;
  if (kind === 'gold' && date) detail = t('passport.goldOn', { date });
  if (kind === 'outline' && date) detail = t('passport.outlineOn', { date });

  return (
    <li className="flex flex-col">
      <Link
        to={`/place/${place.id}`}
        className="group flex flex-1 flex-col rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
      >
        <span className="relative block transition-transform group-active:scale-[0.97]">
          <LandmarkStamp place={place} kind={kind} />
          {kind === 'gold' && (
            <svg
              viewBox="0 0 24 24"
              className="absolute -top-2 -right-2 size-8 drop-shadow"
              aria-hidden="true"
            >
              <path
                fill={SUN}
                d="M12 1.5l2.6 5.7 6.2.7-4.6 4.2 1.3 6.1L12 15.1l-5.5 3.1 1.3-6.1-4.6-4.2 6.2-.7z"
              />
            </svg>
          )}
        </span>
        <span className="mt-3 text-[15px] leading-snug font-semibold text-slate-900">
          {t(place.nameKey)}
        </span>
        {kind !== 'none' && (
          <span className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <StampBadge kind={kind} size="sm" />
            {t(`ui.stamp.${kind}`)}
          </span>
        )}
        {(kind === 'none' || date) && (
          <span className="mt-1 text-sm leading-snug text-slate-500">{detail}</span>
        )}
        {kind === 'outline' && (
          <span className="mt-0.5 text-xs leading-snug text-slate-500">
            {t('passport.outlineHint')}
          </span>
        )}
      </Link>

      {kind === 'gold' &&
        (reviewed ? (
          <p className="mt-2 flex min-h-11 items-center gap-1 text-sm font-semibold text-slate-700">
            <span aria-hidden="true">✓</span> {t('passport.reviewed')}
          </p>
        ) : (
          <Button as={Link} to={`/review/${place.id}`} fullWidth className="mt-2 text-sm">
            {t('passport.writeReview')}
          </Button>
        ))}
    </li>
  );
}
