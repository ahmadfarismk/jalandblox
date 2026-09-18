import { useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import Button from '@/shared/Button';
import { getPlace, getPlaces, getPostcards } from '@/data';
import { markReviewed } from '@/core/progress';
import { getPrefs } from '@/core/settings';
import { submitReview } from '@/core/api';
import ConsentCheckbox from '@/core/ConsentCheckbox';
import PostcardPreview from './components/PostcardPreview';
import { formatDate, looksLikeEmail } from './format';
import { useProgress } from './useProgress';

// Server reasons we can point at a field on this step. Anything else gets the general "try again" message.
const FIELD_FOR_REASON = {
  invalid_email: 'email',
  no_consent: 'consent',
  invalid_postcard: 'choice',
};

// /review/:id/postcard (step 2 of 2, part of task D8)
// The visitor picks ONE postcard. Only places with a gold stamp (a GPS-confirmed
// visit) can be picked; the rest are shown locked. Then email + consent, and send.
export default function PostcardPickScreen() {
  const { id } = useParams();
  const { state } = useLocation();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const progress = useProgress();
  const place = getPlace(id);
  const draft = state?.draft;

  const isGold = (placeId) => progress.stamps?.[placeId]?.kind === 'gold';
  const options = getPostcards().map((card) => ({
    ...card,
    place: getPlace(card.placeId),
    unlocked: isGold(card.placeId),
  }));
  const unlocked = options.filter((o) => o.unlocked);
  const defaultChoice = (unlocked.find((o) => o.placeId === id) ?? unlocked[0])?.placeId ?? null;

  const [choice, setChoice] = useState(defaultChoice);
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [sending, setSending] = useState(false);
  const choiceRef = useRef(null);
  const emailRef = useRef(null);

  // Step 1 must come first (it holds the stars and text), and only after a gold stamp.
  if (!place || !draft || !isGold(id)) return <Navigate to={`/review/${id}`} replace />;

  const chosen = options.find((o) => o.placeId === choice && o.unlocked) ?? null;
  const visitedWithoutPostcard = getPlaces().filter((p) => !p.hasPostcard && isGold(p.id));

  function showErrors(found) {
    setErrors(found);
    const first = ['choice', 'email'].find((field) => found[field]);
    const fieldRefs = { choice: choiceRef, email: emailRef };
    fieldRefs[first]?.current?.focus();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (sending) return;
    setFormError('');

    const found = {};
    if (unlocked.length > 0 && !chosen) found.choice = t('postcardPick.errorChoice');
    if (!looksLikeEmail(email)) found.email = t('review.errors.email');
    if (Object.keys(found).length > 0) {
      showErrors(found);
      return;
    }
    setErrors({});
    setSending(true);

    let result;
    try {
      result = await submitReview({
        placeId: place.id,
        stars: draft.stars,
        text: draft.text,
        email: email.trim(),
        nationality: getPrefs()?.nationality ?? null,
        lang: i18n.resolvedLanguage ?? i18n.language,
        consent: true,
        postcardPlaceId: chosen?.placeId ?? null,
      });
    } catch {
      result = { ok: false, reason: 'network' };
    }
    setSending(false);

    if (result?.ok) {
      markReviewed(place.id);
      navigate(`/postcard/${chosen?.placeId ?? place.id}`, {
        state: { postcardQueued: Boolean(chosen) && Boolean(result.postcardQueued) },
      });
      return;
    }

    const field = FIELD_FOR_REASON[result?.reason];
    if (field) {
      const messages = {
        email: t('review.errors.email'),
        consent: t('review.errors.consent'),
        choice: t('postcardPick.errorChoice'),
      };
      showErrors({ [field]: messages[field] });
    } else if (result?.reason === 'rate_limited') {
      setFormError(t('review.errors.rateLimited'));
    } else {
      setFormError(t('review.errors.failed'));
    }
  }

  const hasErrors = Object.values(errors).some(Boolean);
  const dateLocale = t('meta.dateLocale');

  return (
    <div className="mx-auto max-w-lg pb-44">
      <p className="text-center text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {t('review.step', { current: 2, total: 2 })}
      </p>

      {chosen ? (
        <div className="mt-6 -rotate-2 px-2">
          <PostcardPreview key={chosen.placeId} src={chosen.preview} place={chosen.place} />
        </div>
      ) : (
        <p className="mt-6 rounded-2xl bg-slate-100 p-5 text-sm text-slate-700">
          {t('postcardPick.noneAvailable')}
        </p>
      )}

      <h1 className="mt-8 text-[26px] leading-tight font-bold tracking-tight text-slate-900">
        {t('postcardPick.heading')}
      </h1>
      <p className="mt-1 text-sm text-slate-600">{t('postcardPick.intro')}</p>

      <div aria-live="assertive" className="mt-4 empty:hidden">
        {hasErrors && (
          <p className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-800 ring-1 ring-red-200">
            {t('review.errorSummary')}
          </p>
        )}
        {formError && (
          <p className="rounded-2xl bg-orange-50 p-4 text-sm font-medium text-orange-950 ring-1 ring-orange-200">
            {formError}
          </p>
        )}
      </div>

      <form
        id="postcard-form"
        noValidate
        onSubmit={handleSubmit}
        className="mt-5 flex flex-col gap-7"
      >
        <fieldset aria-describedby={errors.choice ? 'choice-error' : undefined}>
          <legend className="sr-only">{t('postcardPick.optionsLabel')}</legend>
          <div className="flex flex-col gap-3">
            {options.map((option, index) => {
              const isChosen = option.unlocked && option.placeId === choice;
              const optionName = t(option.place.nameKey);
              const visitedOn = formatDate(progress.stamps?.[option.placeId]?.at, dateLocale);
              return (
                <label
                  key={option.placeId}
                  className={`flex items-center gap-3 rounded-3xl p-3 has-focus-visible:outline-2 has-focus-visible:outline-teal-700 ${
                    option.unlocked ? 'cursor-pointer bg-white' : 'cursor-not-allowed bg-slate-50'
                  } ${isChosen ? 'ring-2 ring-teal-700' : errors.choice ? 'ring-2 ring-red-600' : 'ring-1 ring-black/10'}`}
                >
                  <input
                    ref={index === options.findIndex((o) => o.unlocked) ? choiceRef : undefined}
                    type="radio"
                    name="postcard"
                    value={option.placeId}
                    checked={isChosen}
                    disabled={!option.unlocked}
                    onChange={() => {
                      setChoice(option.placeId);
                      setErrors((e) => ({ ...e, choice: undefined }));
                    }}
                    className="sr-only"
                  />
                  <span
                    className={`relative w-28 shrink-0 ${option.unlocked ? '' : 'opacity-50 grayscale'}`}
                  >
                    <PostcardPreview src={option.preview} place={option.place} variant="thumb" />
                    {!option.unlocked && (
                      <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
                        <span className="grid size-9 place-items-center rounded-full bg-slate-950/80 text-white">
                          <svg
                            viewBox="0 0 24 24"
                            className="size-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinejoin="round"
                          >
                            <path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
                          </svg>
                        </span>
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block font-semibold ${option.unlocked ? 'text-slate-900' : 'text-slate-500'}`}
                    >
                      {optionName}
                    </span>
                    <span className="mt-0.5 block text-sm text-slate-500">
                      {option.unlocked
                        ? t('postcardPick.visited', { date: visitedOn })
                        : t('postcardPick.locked', { place: optionName })}
                    </span>
                  </span>
                  {option.unlocked && (
                    <span
                      aria-hidden="true"
                      className={`grid size-7 shrink-0 place-items-center rounded-full ${isChosen ? 'bg-teal-700 text-white' : 'ring-2 ring-slate-300'}`}
                    >
                      {isChosen && (
                        <svg
                          viewBox="0 0 24 24"
                          className="size-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12l4 4 10-10" />
                        </svg>
                      )}
                    </span>
                  )}
                  {isChosen && <span className="sr-only">{t('postcardPick.selected')}</span>}
                </label>
              );
            })}
          </div>
          {errors.choice && (
            <p id="choice-error" className="mt-2 text-sm font-medium text-red-700">
              {errors.choice}
            </p>
          )}
          {visitedWithoutPostcard.length > 0 && (
            <p className="mt-3 text-sm text-slate-500">
              {t('postcardPick.comingSoon', {
                places: visitedWithoutPostcard.map((p) => t(p.nameKey)).join(', '),
              })}
            </p>
          )}
        </fieldset>

        <div>
          <label htmlFor="postcard-email" className="text-base font-semibold text-slate-900">
            {t('review.emailLabel')}
          </label>
          <p id="email-hint" className="text-sm text-slate-500">
            {t('review.emailHint')}
          </p>
          <input
            id="postcard-email"
            ref={emailRef}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck="false"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('review.emailPlaceholder')}
            aria-invalid={errors.email ? 'true' : undefined}
            aria-describedby={`email-hint${errors.email ? ' email-error' : ''}`}
            className={`mt-2 block w-full rounded-2xl bg-white px-4 py-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-2 focus:outline-teal-700 ${
              errors.email ? 'ring-2 ring-red-600' : 'ring-1 ring-slate-300'
            }`}
          />
          {errors.email && (
            <p id="email-error" className="mt-1 text-sm font-medium text-red-700">
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <ConsentCheckbox
            checked={consent}
            onChange={(ticked) => {
              setConsent(ticked);
              if (ticked) setErrors((err) => ({ ...err, consent: undefined }));
            }}
            error={Boolean(errors.consent)}
          />
          {errors.consent && (
            <p className="mt-1 text-sm font-medium text-red-700">{errors.consent}</p>
          )}
        </div>
      </form>

      <div className="fixed inset-x-0 bottom-0 bg-white/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur">
        <div className="mx-auto max-w-lg">
          {chosen && (
            <p className="mb-2 truncate text-center text-sm text-slate-600">
              {t('postcardPick.chosen', { place: t(chosen.place.nameKey) })}
            </p>
          )}
          <Button
            type="submit"
            form="postcard-form"
            size="lg"
            fullWidth
            busy={sending}
            disabled={!consent}
            aria-describedby={consent ? undefined : 'send-hint'}
          >
            {sending ? t('review.sending') : chosen ? t('postcardPick.send') : t('review.send')}
          </Button>
          {!consent && (
            <p id="send-hint" className="mt-2 text-center text-xs text-slate-500">
              {t('review.errors.consent')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
