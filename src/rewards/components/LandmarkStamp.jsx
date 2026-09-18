import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { SUN, themeFor } from './stampTheme';

const W = 160;
const H = 200;
const SLAB = "'Rockwell', 'Roboto Slab', 'Zilla Slab', 'Arvo', Georgia, serif";

// Circles cut out of the paper edge to make the perforations.
const PERFORATIONS = [
  ...Array.from({ length: 16 }, (_, i) => [6 + i * 9.9, 0]),
  ...Array.from({ length: 16 }, (_, i) => [6 + i * 9.9, H]),
  ...Array.from({ length: 20 }, (_, i) => [0, 6 + i * 9.9]),
  ...Array.from({ length: 20 }, (_, i) => [W, 6 + i * 9.9]),
];

/**
 * A landmark drawn as a postage stamp: perforated paper, coloured frame, a small
 * scene with the landmark icon, and its short name on a banner.
 *   kind="gold"    full colour (GPS-confirmed visit)
 *   kind="outline" the same stamp in grey (opened, or checked in without GPS)
 *   kind="none"    an empty slot with a faint icon
 * Decorative: the screen shows the name and status as text next to it.
 */
export default function LandmarkStamp({ place, kind = 'gold', tilt = 0, className = '' }) {
  const { t, i18n } = useTranslation();
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const theme = themeFor(place.id);
  const empty = kind === 'none';
  const label = t(`places.${place.id}.short`).toLocaleUpperCase(i18n.language);

  // Shrink long names so they always fit the banner.
  // Slab capitals run about 0.78 em wide; the banner has ~112 units of room.
  const fontSize = Math.min(17, 112 / Math.max(1, label.length * 0.78));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      className={`block h-auto w-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.12)] ${kind === 'outline' ? 'grayscale' : ''} ${className}`}
      style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}
    >
      <defs>
        <mask id={`paper-${id}`}>
          <rect width={W} height={H} fill="white" />
          {PERFORATIONS.map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4.2" fill="black" />
          ))}
        </mask>
        <clipPath id={`art-${id}`}>
          <rect x="15" y="15" width="130" height="136" />
        </clipPath>
      </defs>

      <rect width={W} height={H} fill={empty ? '#FAFAFA' : '#FFFDF8'} mask={`url(#paper-${id})`} />

      {empty ? (
        <rect
          x="11"
          y="11"
          width="138"
          height="178"
          rx="3"
          fill="none"
          stroke="#D4D4D8"
          strokeWidth="2"
          strokeDasharray="5 5"
        />
      ) : (
        <rect x="9" y="9" width="142" height="182" rx="2" fill={theme.frame} />
      )}

      <g clipPath={`url(#art-${id})`}>
        <rect x="15" y="15" width="130" height="136" fill={empty ? '#F4F4F5' : theme.sky} />
        {!empty && (
          <>
            <circle cx="114" cy="40" r="13" fill={SUN} />
            <path
              d="M34 40 q4 -4 8 0 q4 -4 8 0 M50 52 q3 -3 6 0 q3 -3 6 0"
              fill="none"
              stroke={theme.ink}
              strokeWidth="1.4"
              strokeLinecap="round"
              opacity="0.55"
            />
            <rect x="15" y="130" width="130" height="21" fill={theme.ground} />
          </>
        )}
        <image
          href={kind === 'gold' ? place.iconColour : place.iconGrey}
          x="22"
          y="30"
          width="116"
          height="116"
          opacity={empty ? 0.35 : 1}
        />
      </g>

      <rect x="15" y="151" width="130" height="34" fill={empty ? '#F4F4F5' : '#FFF8EE'} />
      <text
        x={W / 2}
        y="173"
        textAnchor="middle"
        fontFamily={SLAB}
        fontWeight="800"
        fontSize={fontSize}
        letterSpacing="0.5"
        fill={empty ? '#A1A1AA' : theme.ink}
      >
        {label}
      </text>
    </svg>
  );
}
