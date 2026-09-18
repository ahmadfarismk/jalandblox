/**
 * The consent tick box for the Review form (task F12, for Danial's D8).
 *
 * Rules from docs/PLAN.md section 9:
 * - Unticked to start. The form must not send until it is ticked.
 * - One plain sentence: what we collect, why, how to ask for deletion.
 * - A link to the privacy notice.
 *
 * Usage:
 *   const [consent, setConsent] = useState(false);
 *   <ConsentCheckbox checked={consent} onChange={setConsent} />
 *   ...send button disabled={!consent}, and submitReview({ ..., consent })
 *
 * The link opens in a new tab so a half-written review is not lost.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

export default function ConsentCheckbox({ checked, onChange, error = false }) {
  const { t } = useTranslation();
  const id = useId();

  return (
    <div
      className={`flex gap-3 rounded-lg border p-3 ${error ? 'border-red-600' : 'border-slate-300'}`}
    >
      <input
        id={id}
        type="checkbox"
        required
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-invalid={error || undefined}
        className="mt-1 size-6 shrink-0 accent-teal-700"
      />
      <div className="space-y-1 text-sm">
        <label htmlFor={id} className="block text-slate-800">
          {t('consent.label')}
        </label>
        <a
          href="/privacy"
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-11 items-center font-medium text-teal-700 underline"
        >
          {t('consent.link')}
        </a>
      </div>
    </div>
  );
}
