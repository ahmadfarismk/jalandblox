/**
 * The "why we need your location" box, shown BEFORE the phone's own popup
 * (docs/PLAN.md section 10: people say yes more often when they know why).
 *
 * Usage on a screen:
 *   <LocationExplainer onResult={(position) => ...} />
 *
 * - Location already allowed: shows nothing. Start using location straight away.
 * - Not asked yet: shows the sentence and an "Allow location" button. Tapping it
 *   makes the phone ask, then calls onResult(position) with the first reading.
 * - Denied: shows how to turn it back on. The app still works without it.
 *
 * `alwaysShow` skips the permission check and shows the box (debug menu only).
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getPermissionState, getPosition } from './location';

export default function LocationExplainer({ onResult, alwaysShow = false }) {
  const { t } = useTranslation();
  /** null = still checking, then 'granted' | 'prompt' | 'denied' | 'unknown' | 'asking' | 'unavailable' */
  const [state, setState] = useState(alwaysShow ? 'prompt' : null);

  useEffect(() => {
    if (alwaysShow) return undefined;
    let active = true;
    getPermissionState().then((s) => active && setState(s));
    return () => {
      active = false;
    };
  }, [alwaysShow]);

  async function allow() {
    if (alwaysShow) return onResult?.({ ok: false, reason: 'error' });
    setState('asking');
    const position = await getPosition({ readings: 1 });
    if (position.ok) setState('granted');
    else if (position.reason === 'no_permission') setState('denied');
    else setState('unavailable');
    onResult?.(position);
  }

  if (state === null || state === 'granted') return null;

  if (state === 'denied' || state === 'unavailable') {
    return (
      <p role="status" className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
        {t(`location.${state}`)}
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-4">
      <p className="text-sm text-slate-700">{t('location.explainer')}</p>
      <button
        type="button"
        onClick={allow}
        disabled={state === 'asking'}
        className="min-h-11 w-full rounded-lg bg-teal-700 px-4 font-medium text-white disabled:opacity-60"
      >
        {state === 'asking' ? t('location.asking') : t('location.allow')}
      </button>
    </div>
  );
}
