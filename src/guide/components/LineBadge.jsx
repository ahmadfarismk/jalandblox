/**
 * A rail line as a coloured badge: its code (or kind) and name, in the line's
 * own colour, so it matches the signs in the station. Text colour is picked
 * to stay readable on light lines like the KL Monorail.
 *
 * @param {object} props
 * @param {{ code: string|null, kind: string, colour: string, nameKey: string }} props.line from getLine()
 * @param {string} [props.colour] a step's own lineColour, if it differs
 * @param {'sm'|'md'} [props.size]
 */
import { useTranslation } from 'react-i18next';
import { textOn } from '../routeLegs';

export default function LineBadge({ line, colour, size = 'md', className = '' }) {
  const { t } = useTranslation();
  const background = colour || line.colour;
  const small = size === 'sm';

  return (
    <span
      style={{ backgroundColor: background, color: textOn(background) }}
      className={[
        'inline-flex max-w-full items-center gap-1.5 rounded-full font-semibold',
        small ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span
        className={`shrink-0 rounded-full bg-white/25 font-bold tracking-wide ${small ? 'px-1.5' : 'px-2 py-0.5'}`}
      >
        {line.code ?? line.kind}
      </span>
      <span className="truncate">{t(line.nameKey)}</span>
    </span>
  );
}
