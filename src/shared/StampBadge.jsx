/**
 * Shared stamp badge (task S1, docs/PLAN.md section 10).
 *
 * Three states, matching `getStamp()` from core/progress.js:
 *   none    - no stamp yet (dashed empty circle)
 *   outline - opened the story, or finished the journey without GPS
 *   gold    - GPS confirmed. Gold never goes back to outline.
 *
 * The badge is a picture only. Any text next to it (the landmark name, the
 * date) is the screen's job, so it can come from the locale files.
 *
 * @param {object} props
 * @param {'none'|'outline'|'gold'} [props.kind]
 * @param {'sm'|'md'|'lg'} [props.size] 32px, 48px or 72px.
 * @param {string} [props.label] Accessible name, e.g. the translated "Gold stamp".
 *   Leave it out and the badge is hidden from screen readers, for when the text
 *   beside it already says the same thing.
 * @param {string} [props.caption] Optional short line under the badge, already
 *   translated and formatted by the caller (the passport puts the date here).
 */

const SIZES = {
  sm: 'size-8',
  md: 'size-12',
  lg: 'size-18',
};

// A five-pointed star drawn inside the 48x48 box, centred on the circle.
const STAR =
  'M24 14 L26.47 20.6 L33.51 20.91 L27.99 25.3 L29.88 32.09 L24 28.2 ' +
  'L18.12 32.09 L20.01 25.3 L14.49 20.91 L21.53 20.6 Z';

export default function StampBadge({
  kind = 'none',
  size = 'md',
  label,
  caption,
  className = '',
  ...props
}) {
  const state = kind === 'gold' || kind === 'outline' ? kind : 'none';
  const hidden = label ? undefined : true;

  return (
    <span
      className={['inline-flex flex-col items-center gap-1', className].filter(Boolean).join(' ')}
      {...props}
    >
      <svg
        viewBox="0 0 48 48"
        className={SIZES[size] ?? SIZES.md}
        role={label ? 'img' : undefined}
        aria-label={label}
        aria-hidden={hidden}
      >
        {state === 'none' ? (
          <circle
            cx="24"
            cy="24"
            r="21"
            fill="none"
            strokeWidth="2"
            strokeDasharray="5 4"
            className="stroke-slate-300"
          />
        ) : null}

        {state === 'outline' ? (
          <>
            <circle
              cx="24"
              cy="24"
              r="21"
              fill="none"
              strokeWidth="2"
              className="stroke-slate-400"
            />
            <path
              d={STAR}
              fill="none"
              strokeWidth="2"
              strokeLinejoin="round"
              className="stroke-slate-400"
            />
          </>
        ) : null}

        {state === 'gold' ? (
          <>
            <circle
              cx="24"
              cy="24"
              r="21"
              strokeWidth="2"
              className="fill-amber-400 stroke-amber-600"
            />
            <path d={STAR} className="fill-white" />
          </>
        ) : null}
      </svg>

      {caption ? <span className="text-xs text-slate-500">{caption}</span> : null}
    </span>
  );
}
