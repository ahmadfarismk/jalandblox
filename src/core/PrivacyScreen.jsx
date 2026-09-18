// Placeholder. The real privacy notice is task F12. Its wording must be checked
// by someone qualified before launch (docs/PLAN.md section 9).
import { useTranslation } from 'react-i18next';

export default function PrivacyScreen() {
  const { t } = useTranslation();
  return (
    <section>
      <h1 className="text-2xl font-semibold">{t('privacy.title')}</h1>
      <p className="mt-2 text-slate-500">{t('privacy.comingSoon')}</p>
    </section>
  );
}
