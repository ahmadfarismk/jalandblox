/**
 * Privacy notice at /privacy (task F12). Linked from Settings and from the
 * consent tick box on the Review form (<ConsentCheckbox />).
 * The wording lives in the locale files (privacy.*); the facts in privacy.js.
 */
import { useTranslation } from 'react-i18next';
import { PRIVACY_CONTACT_EMAIL, PRIVACY_LAST_UPDATED } from './privacy';

const SECTIONS = ['phone', 'review', 'why', 'visible', 'services', 'keep', 'rights'];

export default function PrivacyScreen() {
  const { t, i18n } = useTranslation();
  const hasEmail = PRIVACY_CONTACT_EMAIL !== 'TBC';
  const date = new Date(PRIVACY_LAST_UPDATED).toLocaleDateString(i18n.language, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <article className="space-y-6 pb-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{t('privacy.title')}</h1>
        <p className="text-slate-700">{t('privacy.intro')}</p>
        <p className="text-sm text-slate-500">{t('privacy.updated', { date })}</p>
      </header>

      {SECTIONS.map((key) => (
        <section key={key} className="space-y-1">
          <h2 className="font-semibold">{t(`privacy.${key}.title`)}</h2>
          <p className="text-slate-700">{t(`privacy.${key}.body`)}</p>
        </section>
      ))}

      <section className="space-y-1">
        <h2 className="font-semibold">{t('privacy.contact.title')}</h2>
        {hasEmail ? (
          <p className="text-slate-700">
            {t('privacy.contact.body')}{' '}
            <a
              href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
              className="font-medium text-teal-700 underline"
            >
              {PRIVACY_CONTACT_EMAIL}
            </a>
          </p>
        ) : (
          <p className="text-slate-700">{t('privacy.contact.tbc')}</p>
        )}
      </section>
    </article>
  );
}
