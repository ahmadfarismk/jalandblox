/**
 * The little picture beside a journey step (task S5).
 *
 * One shape per step type, so a visitor can tell walking from riding at a
 * glance without reading. It is decoration: the step always has words next to
 * it, which come from the language files.
 *
 * @param {object} props
 * @param {'walk'|'board'|'ride'|'exit'|'arrive'} props.type
 * @param {string} [props.colour] line colour for board and ride steps
 */

const SHAPES = {
  // A dotted path: walking.
  walk: (
    <>
      <circle cx="6" cy="18" r="1.6" />
      <circle cx="12" cy="13" r="1.6" />
      <circle cx="18" cy="8" r="1.6" />
    </>
  ),
  // An arrow going into a door: getting on.
  board: (
    <>
      <path d="M14 4h5v16h-5" fill="none" strokeWidth="2" stroke="currentColor" />
      <path
        d="M4 12h9m-3.5-3.5L13 12l-3.5 3.5"
        fill="none"
        strokeWidth="2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  // A train car on two wheels: riding.
  ride: (
    <>
      <rect
        x="4"
        y="4"
        width="16"
        height="12"
        rx="3"
        fill="none"
        strokeWidth="2"
        stroke="currentColor"
      />
      <circle cx="8" cy="19" r="2" />
      <circle cx="16" cy="19" r="2" />
    </>
  ),
  // The same door, arrow going out: getting off.
  exit: (
    <>
      <path d="M10 4H5v16h5" fill="none" strokeWidth="2" stroke="currentColor" />
      <path
        d="M11 12h9m-3.5-3.5L20 12l-3.5 3.5"
        fill="none"
        strokeWidth="2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  // A flag: you are there.
  arrive: (
    <>
      <path d="M6 21V3" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
      <path d="M6 4h12l-3 4 3 4H6z" />
    </>
  ),
};

export default function StepIcon({ type, colour, className = '' }) {
  const shape = SHAPES[type] ?? SHAPES.walk;
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={colour ? { color: colour } : undefined}
      className={['size-6 fill-current', className].filter(Boolean).join(' ')}
    >
      {shape}
    </svg>
  );
}
