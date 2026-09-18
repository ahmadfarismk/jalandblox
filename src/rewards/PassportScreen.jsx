// Placeholder. Built in task D3.
import { useTranslation } from 'react-i18next';

export default function PassportScreen() {
  const { t } = useTranslation();
  return (
    <section>
      <h1 className="text-2xl font-semibold">{t('ui.tabs.passport')}</h1>
      <p className="mt-2 text-slate-500">{t('ui.comingSoon')}</p>
    </section>
  );
}
