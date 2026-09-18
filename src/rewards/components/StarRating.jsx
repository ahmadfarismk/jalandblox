import { useTranslation } from 'react-i18next';

/**
 * 1 to 5 stars built from real radio buttons, so arrow keys and screen readers
 * work without extra code. Each star is a 44 px tap target.
 */
export default function StarRating({ value, onChange, error, errorId, inputRef }) {
  const { t } = useTranslation();

  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 text-base font-semibold text-slate-900">
        {t('review.starsLabel')}
      </legend>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className="relative grid size-12 cursor-pointer place-items-center rounded-full has-focus-visible:outline-2 has-focus-visible:outline-teal-700"
          >
            <input
              ref={n === 1 ? inputRef : undefined}
              type="radio"
              name="stars"
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="peer sr-only"
              aria-invalid={error ? 'true' : undefined}
            />
            <span className="sr-only">{t('review.star', { count: n })}</span>
            <svg
              viewBox="0 0 24 24"
              className={`size-8 ${n <= value ? 'fill-orange-500 stroke-orange-600' : 'fill-slate-100 stroke-slate-300'}`}
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path
                d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"
                strokeLinejoin="round"
              />
            </svg>
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}
