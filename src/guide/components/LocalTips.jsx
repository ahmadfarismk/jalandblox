/**
 * "What locals say": real tips from people who live in KL, with their first
 * name. Hidden when a route has none yet, so nothing made-up ever shows.
 *
 * @param {object} props
 * @param {{ textKey: string, by: string }[]} [props.tips] from route.localTips
 */
import { useTranslation } from 'react-i18next';

export default function LocalTips({ tips = [] }) {
  const { t, i18n } = useTranslation();
  // Only tips whose text exists and is filled in (never a raw key or "TBC").
  const shown = tips.filter(
    (tip) => tip?.by && i18n.exists(tip.textKey) && t(tip.textKey) !== 'TBC',
  );
  if (shown.length === 0) return null;

  return (
    <section className="mt-4 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900">
        <svg viewBox="0 0 24 24" className="size-5 text-amber-600" aria-hidden="true">
          <path
            fill="currentColor"
            d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-4.3 3.4A.5.5 0 0 1 4 20V5a1 1 0 0 1 1-1z"
          />
        </svg>
        {t('journey.localsSay')}
      </h2>
      <p className="mt-0.5 text-sm text-slate-600">{t('journey.localsSayHint')}</p>
      <ul className="mt-3 space-y-3">
        {shown.map((tip) => (
          <li key={tip.textKey}>
            <figure>
              <blockquote className="rounded-xl bg-white p-3 text-slate-800 shadow-sm">
                “{t(tip.textKey)}”
              </blockquote>
              <figcaption className="mt-1 pl-3 text-sm font-medium text-slate-600">
                — {t('journey.localBy', { name: tip.by })}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
