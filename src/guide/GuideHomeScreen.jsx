// Placeholder. Built in task S3.
import { useTranslation } from 'react-i18next';

export default function GuideHomeScreen() {
  const { t } = useTranslation();
  return (
    <section>
      <h1 className="text-2xl font-semibold">{t('ui.tabs.guide')}</h1>
      <p className="mt-2 text-slate-500">{t('ui.comingSoon')}</p>
    </section>
  );
}
