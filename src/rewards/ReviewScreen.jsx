import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import Button from '@/shared/Button';
import Card from '@/shared/Card';
import { getPlace } from '@/data';
import LandmarkStamp from './components/LandmarkStamp';
import StarRating from './components/StarRating';
import { useProgress } from './useProgress';

export const MAX_TEXT = 500;

// Task D8 · /review/:id (step 1 of 2)
// Stars and an optional short review. Step 2 (/review/:id/postcard) picks the
// postcard and takes the email and consent, then sends everything.
export default function ReviewScreen() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const progress = useProgress();
  const place = getPlace(id);

  // Coming back from step 2 restores what was typed.
  const saved = location.state?.draft;
  const [stars, setStars] = useState(saved?.stars ?? 0);
  const [text, setText] = useState(saved?.text ?? '');
  const [errors, setErrors] = useState({});
  const starsRef = useRef(null);
  const textRef = useRef(null);

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

  // The review button only appears after a gold stamp (plan section 10), so guard direct visits too.
  if (progress.stamps?.[place.id]?.kind !== 'gold') {
    return (
      <div className="mx-auto max-w-lg pb-8">
        <Card className="mt-6 text-center">
          <div className="mx-auto w-28">
            <LandmarkStamp place={place} kind="outline" tilt={-5} />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
            {t('review.lockedTitle')}
          </h1>
          <p className="mt-2 text-slate-600">{t('review.lockedBody', { place: name })}</p>
          <Button
            size="lg"
            fullWidth
            className="mt-5"
            onClick={() => navigate(`/place/${place.id}`)}
          >
            {t('review.lockedAction', { place: name })}
          </Button>
        </Card>
      </div>
    );
  }

  const alreadyReviewed = (progress.reviewed ?? []).includes(place.id);

  function handleNext(event) {
    event.preventDefault();
    const found = {};
    if (!(stars >= 1 && stars <= 5)) found.stars = t('review.errors.stars');
    if (text.length > MAX_TEXT) found.text = t('review.errors.text', { max: MAX_TEXT });
    setErrors(found);
    const first = ['stars', 'text'].find((field) => found[field]);
    if (first) {
      (first === 'stars' ? starsRef : textRef).current?.focus();
      return;
    }
    const draft = { stars, text: text.trim() };
    // Keep the draft on this page's history entry too, so Back from step 2 restores it.
    navigate(location.pathname, { replace: true, state: { draft } });
    navigate(`/review/${place.id}/postcard`, { state: { draft } });
  }

  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <div className="mx-auto max-w-lg pb-8">
      <p className="text-center text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {t('review.step', { current: 1, total: 2 })}
      </p>

      <div className="mt-5 flex items-center gap-4">
        <div className="w-24 shrink-0">
          <LandmarkStamp place={place} kind="gold" tilt={-6} />
        </div>
        <div className="min-w-0">
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-slate-900">
            {t('review.heading', { place: name })}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {place.hasPostcard
              ? t('review.introPostcard', { place: name })
              : t('review.introNoPostcard', { place: name })}
          </p>
        </div>
      </div>

      {alreadyReviewed && (
        <p className="mt-5 rounded-2xl bg-slate-100 p-4 text-sm text-slate-700">
          {t('review.alreadyReviewed', { place: name })}
        </p>
      )}

      <div aria-live="assertive" className="mt-5 empty:hidden">
        {hasErrors && (
          <p className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-800 ring-1 ring-red-200">
            {t('review.errorSummary')}
          </p>
        )}
      </div>

      <form noValidate onSubmit={handleNext} className="mt-6 flex flex-col gap-7">
        <StarRating
          value={stars}
          onChange={(n) => {
            setStars(n);
            setErrors((e) => ({ ...e, stars: undefined }));
          }}
          error={errors.stars}
          errorId="stars-error"
          inputRef={starsRef}
        />

        <div>
          <label htmlFor="review-text" className="text-base font-semibold text-slate-900">
            {t('review.textLabel')}
          </label>
          <textarea
            id="review-text"
            ref={textRef}
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('review.textPlaceholder')}
            aria-invalid={errors.text ? 'true' : undefined}
            aria-describedby={`text-count${errors.text ? ' text-error' : ''}`}
            className={`mt-2 block w-full rounded-2xl bg-white px-4 py-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-2 focus:outline-teal-700 ${
              errors.text ? 'ring-2 ring-red-600' : 'ring-1 ring-slate-300'
            }`}
          />
          <p
            id="text-count"
            className={`mt-1 text-right text-sm ${text.length > MAX_TEXT ? 'font-semibold text-red-700' : 'text-slate-500'}`}
          >
            {t('review.textCount', { count: text.length, max: MAX_TEXT })}
          </p>
          {errors.text && (
            <p id="text-error" className="text-sm font-medium text-red-700">
              {errors.text}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" fullWidth>
          {t('review.next')}
          <span aria-hidden="true">→</span>
        </Button>
      </form>
    </div>
  );
}
