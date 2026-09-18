/**
 * Arrival screen (task S6, docs/PLAN.md flow F2).
 *
 * The one recommended way from KLIA to KL Sentral, with the reason for the
 * pick, and the other ways smaller underneath. Only the recommended option has
 * a hand-written route card, so only that one can start the steps; the others
 * are there so a visitor can see they were considered.
 *
 * Every price and time comes from Danial's arrival.json. Anything still marked
 * TBC there reaches this screen as the word "TBC", never as an invented number.
 */
import { useMemo } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getArrivalOptions } from '@/data';
import Button from '@/shared/Button';
import Card from '@/shared/Card';
import StepIcon from './components/StepIcon';

/** KLIA on the left, KL Sentral on the right. A picture of the whole trip. */
function TripDiagram() {
  const { t } = useTranslation();
  return (
    <figure className="mt-4">
      <Card className="flex items-center gap-2">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">
            {t('arrival.pickup', 'KLIA arrival hall')}
          </span>
          <span className="block text-xs text-slate-500">
            {t('arrival.pickupHint', 'Terminal 1 or 2')}
          </span>
        </span>

        <span aria-hidden="true" className="flex shrink-0 items-center gap-1 text-slate-400">
          <span className="h-px w-4 bg-slate-300" />
          <StepIcon type="ride" className="size-5" />
          <span className="h-px w-4 bg-slate-300" />
        </span>

        <span className="min-w-0 flex-1 text-right">
          <span className="block text-sm font-medium">KL Sentral</span>
          <span className="block text-xs text-slate-500">
            {t('arrival.dropoffHint', 'City transport hub')}
          </span>
        </span>
      </Card>
      <figcaption className="mt-1 text-center text-xs text-slate-400">
        {t('arrival.schematic', 'Diagram, not to scale')}
      </figcaption>
    </figure>
  );
}

export default function ArrivalScreen() {
  const { t } = useTranslation();
  const options = useMemo(() => getArrivalOptions(), []);
  const [recommended, ...others] = options;

  if (!recommended) {
    return (
      <section>
        <h1 className="text-2xl font-semibold">{t('arrival.title', 'From KLIA to KL Sentral')}</h1>
        <p className="mt-2 text-slate-500">{t('ui.comingSoon', 'Coming soon.')}</p>
      </section>
    );
  }

  return (
    <section className="pb-4">
      <h1 className="text-2xl font-semibold">{t('arrival.title', 'From KLIA to KL Sentral')}</h1>

      <TripDiagram />

      <Card className="mt-4 border-teal-700">
        <p className="text-xs font-medium tracking-wide text-teal-700 uppercase">
          {t('arrival.recommended', 'Our pick')}
        </p>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">{t(recommended.nameKey)}</h2>
          <span className="shrink-0 font-medium">{t(recommended.priceShortKey)}</span>
        </div>
        <p className="mt-1 text-sm text-slate-600">{t(recommended.minutesNoteKey)}</p>
        <p className="text-sm text-slate-600">{t(recommended.priceNoteKey)}</p>

        <h3 className="mt-4 text-sm font-medium">{t('arrival.why', 'Why this way')}</h3>
        <p className="mt-1 text-sm text-slate-700">{t(recommended.whyKey)}</p>

        <h3 className="mt-4 text-sm font-medium">{t('arrival.howToPay', 'How to pay')}</h3>
        <p className="mt-1 text-sm text-slate-700">{t(recommended.payKey)}</p>

        {recommended.routeId ? (
          <Button
            as={Link}
            to={`/journey/${recommended.routeId}`}
            size="lg"
            fullWidth
            className="mt-4"
          >
            {t('arrival.startWith', { option: t(recommended.nameKey) })}
          </Button>
        ) : null}
      </Card>

      {others.length > 0 ? (
        <>
          <h2 className="mt-8 font-medium">{t('arrival.otherOptions', 'Other ways')}</h2>
          <ul
            aria-label={t('arrival.optionsLabel', 'Ways to KL Sentral')}
            className="mt-2 space-y-2"
          >
            {others.map((option) => (
              <li key={option.id}>
                <Card>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-medium">{t(option.nameKey)}</h3>
                    <span className="shrink-0 text-sm text-slate-600">
                      {t(option.priceShortKey)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {t(option.tagKey)} · {t(option.minutesNoteKey)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{t(option.whyKey)}</p>
                  <p className="mt-1 text-sm text-slate-500">{t(option.payKey)}</p>
                  {option.routeId ? (
                    <Button
                      as={Link}
                      to={`/journey/${option.routeId}`}
                      variant="secondary"
                      fullWidth
                      className="mt-3"
                    >
                      {t('arrival.start', 'Start the steps')}
                    </Button>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <p className="mt-6 text-sm text-slate-500">
        {t(
          'arrival.estimateNote',
          'Times and prices are estimates. Check the operator before you travel.',
        )}
      </p>

      <Link
        to="/learn"
        className="mt-4 inline-flex min-h-11 items-center font-medium text-teal-700 underline"
      >
        {t('arrival.learnBasics', 'New to KL trains? Learn the basics')}
      </Link>
    </section>
  );
}
