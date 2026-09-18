/**
 * Shared card (task S1, docs/PLAN.md section 6).
 *
 * A white box with a light border. Use it for a landmark row, a route card or
 * any block of content. It holds no text of its own.
 *
 * @param {object} props
 * @param {boolean} [props.interactive] Makes the whole card tappable (at least
 *   44px tall, with a pressed state). Pair it with `as="button"` or a Link.
 * @param {boolean} [props.padded] Set false when the card holds a full-width
 *   photo and you want to pad the inside parts yourself.
 * @param {string|Function} [props.as] Render as something else, e.g. 'li', 'a' or Link.
 */
export default function Card({
  children,
  as: Tag = 'div',
  interactive = false,
  padded = true,
  className = '',
  ...props
}) {
  return (
    <Tag
      className={[
        'block overflow-hidden rounded-2xl border border-slate-200 bg-white',
        padded ? 'p-4' : '',
        interactive
          ? [
              'w-full min-h-11 text-left transition-colors active:bg-slate-50',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700',
            ].join(' ')
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </Tag>
  );
}
