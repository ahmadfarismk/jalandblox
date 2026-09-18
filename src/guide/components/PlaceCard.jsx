/**
 * One landmark in a list (task S3). Used by the Guide home.
 *
 * Shows the photo (when Danial's photo exists), the name, what kind of place
 * it is, how far away it is, and the stamp the visitor has for it. The whole
 * card is one tap target, so it is easy to hit on a moving train.
 *
 * Every word comes from the caller, already translated.
 *
 * @param {object} props
 * @param {string} props.to where tapping goes, e.g. '/place/petronas'
 * @param {string} props.name
 * @param {string} [props.category] short label, e.g. "Heritage"
 * @param {string} [props.photo] image path. The landmark photos arrive with
 *   task D10; until then the card shows a plain grey square instead. It is a
 *   background image on purpose: a missing one leaves the square empty rather
 *   than showing the browser's broken-picture icon.
 * @param {string|null} [props.distance] e.g. "450 m away", or null for nothing
 * @param {'none'|'outline'|'gold'} [props.stamp]
 * @param {string} [props.stampLabel] translated name of the stamp, for screen readers
 */
import { Link } from 'react-router';
import Card from '@/shared/Card';
import StampBadge from '@/shared/StampBadge';

export default function PlaceCard({
  to,
  name,
  category,
  photo,
  distance,
  stamp = 'none',
  stampLabel,
}) {
  return (
    <Card as={Link} to={to} interactive padded={false} className="flex items-center gap-3 p-3">
      <span
        aria-hidden="true"
        style={photo ? { backgroundImage: `url(${photo})` } : undefined}
        className="size-16 shrink-0 rounded-xl bg-slate-100 bg-cover bg-center"
      />

      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{name}</span>
        {category ? <span className="block text-sm text-slate-500">{category}</span> : null}
        {distance ? <span className="block text-sm text-slate-500">{distance}</span> : null}
      </span>

      <StampBadge kind={stamp} size="sm" label={stampLabel} className="shrink-0" />
    </Card>
  );
}
