/**
 * Shared avatar (task S1, docs/PLAN.md section 10).
 *
 * A neutral silhouette made of three simple circles: the round frame, a head
 * and a body. Drawn in code, one colour, no face, no gender, no mascot.
 *
 * The colour is whatever text colour it inherits, so a screen can change it
 * with a class like `text-teal-700`.
 *
 * @param {object} props
 * @param {'sm'|'md'|'lg'} [props.size] 32px, 48px or 72px.
 * @param {string} [props.label] Accessible name, already translated. Leave it
 *   out and the avatar is hidden from screen readers (it is decoration).
 */
import { useId } from 'react';

const SIZES = {
  sm: 'size-8',
  md: 'size-12',
  lg: 'size-18',
};

export default function Avatar({ size = 'md', label, className = '', ...props }) {
  const clipId = useId();

  return (
    <svg
      viewBox="0 0 48 48"
      className={[SIZES[size] ?? SIZES.md, 'text-slate-400', className].filter(Boolean).join(' ')}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...props}
    >
      <clipPath id={clipId}>
        <circle cx="24" cy="24" r="24" />
      </clipPath>

      {/* 1. the frame */}
      <circle cx="24" cy="24" r="24" className="fill-current opacity-15" />
      {/* 2. the head */}
      <circle cx="24" cy="19" r="7.5" className="fill-current" />
      {/* 3. the body, cut off by the frame */}
      <circle cx="24" cy="41" r="13.5" className="fill-current" clipPath={`url(#${clipId})`} />
    </svg>
  );
}
