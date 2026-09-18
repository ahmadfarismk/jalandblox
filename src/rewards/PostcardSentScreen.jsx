import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import Button from '@/shared/Button';
import { getPlace, getPlaces, getPostcardPreview } from '@/data';
import LandmarkStamp from './components/LandmarkStamp';
import PostcardPreview from './components/PostcardPreview';
import { SUN } from './components/stampTheme';
import { useProgress } from './useProgress';

// Task D9 · /postcard/:id
// After a review: "check your email" with the postcard preview, or a "coming soon"
// message when this landmark has no postcard yet (or the backend queued none).
export default function PostcardSentScreen() {
  const { id } = useParams();
  const { state } = useLocation();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const progress = useProgress();
  const place = getPlace(id);

  if (!place) {
    return (
      <div className="mx-auto max-w-lg py-8">
        <p className="text-slate-700">{t('ui.notFound')}</p>
        <Link
          to="/"
          className="mt-4 inline-flex min-h-11 items-center font-semibold text-slate-900 underline"
        >
          {t('ui.goHome')}
        </Link>
      </div>
    );
  }

  const name = t(place.nameKey);
  // The review screen passes what the backend said. On a reload that is gone, so fall back to the data.
  const queued =
    typeof state?.postcardQueued === 'boolean' ? state.postcardQueued : place.hasPostcard;
  const sent = place.hasPostcard && queued;

  const next = getPlaces().find(
    (p) => p.id !== place.id && progress.stamps?.[p.id]?.kind !== 'gold',
  );

  return (
    <div className="mx-auto max-w-lg pt-2 pb-8">
      {sent ? (
        <>
          <span
            className="grid size-14 place-items-center rounded-full bg-teal-700 text-white"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            >
              <path d="M3 6h18v12H3zM3 7l9 7 9-7" />
            </svg>
          </span>
          <h1 className="mt-5 text-[32px] leading-[1.05] font-extrabold tracking-tight text-slate-900">
            {t('postcard.sentTitle')}
          </h1>
          <p className="mt-3 text-slate-600">{t('postcard.sentBody', { place: name })}</p>
          <div className="mt-8 -rotate-2 px-1">
            <PostcardPreview src={getPostcardPreview(place.id)} place={place} />
          </div>
        </>
      ) : (
        <>
          <div className="mx-auto w-40">
            <LandmarkStamp place={place} kind="gold" tilt={-6} />
          </div>
          <h1 className="mt-8 text-[32px] leading-[1.05] font-extrabold tracking-tight text-slate-900">
            {t('postcard.comingSoonTitle')}
          </h1>
          <p className="mt-3 text-slate-600">{t('postcard.comingSoonBody', { place: name })}</p>
        </>
      )}

      <div className="mt-10 flex flex-col gap-3">
        {next ? (
          <Button size="lg" fullWidth onClick={() => navigate(`/place/${next.id}`)}>
            {t('postcard.nextStop', { place: t(next.nameKey) })}
            <span aria-hidden="true">→</span>
          </Button>
        ) : (
          <p className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 p-4 text-center font-semibold text-slate-900">
            <span aria-hidden="true" style={{ color: SUN }}>
              ★
            </span>{' '}
            {t('postcard.allDone')}
          </p>
        )}
        <Button variant="secondary" size="lg" fullWidth onClick={() => navigate('/passport')}>
          {t('postcard.backToPassport')}
        </Button>
      </div>
    </div>
  );
}
