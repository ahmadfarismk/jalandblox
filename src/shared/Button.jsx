/**
 * Shared button (task S1, docs/PLAN.md section 6).
 *
 * All visible text comes from the caller, so each screen keeps its own locale
 * keys. Tap target is at least 44px tall (56px for size="lg").
 *
 * @param {object} props
 * @param {'primary'|'secondary'|'quiet'} [props.variant] Primary is the one main
 *   action on a screen ("I'm Here"). Secondary is a side action ("Open in Google
 *   Maps"). Quiet is a text-only action.
 * @param {'md'|'lg'} [props.size] 44px or 56px tall.
 * @param {boolean} [props.fullWidth] Stretch to the full width of the parent.
 * @param {boolean} [props.busy] Show a spinner and block taps while waiting.
 * @param {boolean} [props.disabled] Block taps.
 * @param {string|Function} [props.as] Render as something else, e.g. 'a' or Link.
 */

const VARIANTS = {
  primary: 'bg-teal-700 text-white active:bg-teal-800',
  secondary: 'border border-slate-300 bg-white text-slate-900 active:bg-slate-100',
  quiet: 'text-teal-700 active:bg-teal-50',
};

const SIZES = {
  md: 'min-h-11 px-4 text-base',
  lg: 'min-h-14 px-5 text-lg',
};

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 animate-spin" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.3"
      />
      <path
        d="M12 3a9 9 0 0 1 9 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  busy = false,
  disabled = false,
  as: Tag = 'button',
  className = '',
  ...props
}) {
  const isButton = Tag === 'button';
  const off = disabled || busy;

  return (
    <Tag
      {...(isButton ? { type: 'button', disabled: off } : { 'aria-disabled': off || undefined })}
      aria-busy={busy || undefined}
      className={[
        'inline-flex select-none items-center justify-center gap-2 rounded-xl font-medium',
        'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
        'focus-visible:outline-teal-700',
        VARIANTS[variant] ?? VARIANTS.primary,
        SIZES[size] ?? SIZES.md,
        fullWidth ? 'w-full' : '',
        off ? 'pointer-events-none opacity-50' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {busy ? <Spinner /> : null}
      {children}
    </Tag>
  );
}
