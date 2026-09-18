// Placeholder. Built in task S3.
import { Navigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getPrefs } from '@/core/settings';
import { isWelcomeDone } from './welcomePrefs';

export default function GuideHomeScreen() {
  const { t } = useTranslation();

  // First open: nobody has answered the Welcome questions yet, so show them
  // first (task S2). Once a start choice is saved this never happens again.
  // The link and the QR code both open '/', so this is where they arrive.
  if (!isWelcomeDone(getPrefs())) return <Navigate to="/welcome" replace />;

  return (
    <section>
      <h1 className="text-2xl font-semibold">{t('ui.tabs.guide')}</h1>
      <p className="mt-2 text-slate-500">{t('ui.comingSoon')}</p>
    </section>
  );
}
