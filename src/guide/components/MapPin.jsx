/**
 * A landmark on the Map screen (task S7, colour unlock in S8).
 *
 * Grey until the visitor has a gold stamp for the place, then gold. Danial's
 * drawn icons arrive with task D12; when they exist the pin shows the right
 * one, and until then it is a plain drawn pin, so the map is never broken.
 *
 * The whole pin, name and all, is one tap target at least 44px tall.
 *
 * @param {object} props
 * @param {string} props.name already translated
 * @param {boolean} props.collected true once there is a gold stamp
 * @param {boolean} [props.justUnlocked] the stamp arrived a moment ago: the pin
 *   gives one quiet ring so the visitor sees which icon changed (task S8)
 * @param {string} [props.icon] path to Danial's icon, grey or colour
 * @param {{left: number, top: number}} [props.at] where on the map, in percent.
 *   Left out by the 3D map, which positions the pin itself.
 * @param {() => void} props.onSelect
 */
import { useState } from 'react';

export default function MapPin({ name, collected, justUnlocked, icon, at, onSelect }) {
  const [iconOk, setIconOk] = useState(false);

  return (
    <button
      type="button"
      onClick={onSelect}
      style={at ? { left: `${at.left}%`, top: `${at.top}%` } : undefined}
      // The icon hangs from its point, so the point is what sits on the
      // coordinate, the way a pin does on a paper map. The name follows below.
      className={`flex min-h-11 w-20 flex-col items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
        at ? 'absolute -translate-x-1/2 -translate-y-7' : 'relative'
      }`}
    >
      {/* A ring around the pin that has just been earned. Phones set to reduce
          motion get the colour change on its own, with no animation. */}
      {justUnlocked ? (
        <span
          aria-hidden="true"
          className="absolute bottom-0 size-8 animate-ping rounded-full bg-amber-400 opacity-75 motion-reduce:hidden"
        />
      ) : null}

      {/* Danial's icons (task D12) are not drawn yet, so the pin starts as the
          plain shape below and only swaps once a real icon has loaded. That
          way a missing file is invisible instead of a broken picture. */}
      {icon ? (
        <img
          src={icon}
          alt=""
          onLoad={() => setIconOk(true)}
          onError={() => setIconOk(false)}
          className={iconOk ? 'size-7 object-contain' : 'hidden'}
        />
      ) : null}

      {iconOk ? null : (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7 drop-shadow-sm">
          <path
            d="M12 23 L6.5 12.5 A6.5 6.5 0 1 1 17.5 12.5 Z"
            className={
              collected ? 'fill-amber-400 stroke-amber-600' : 'fill-white stroke-slate-500'
            }
            strokeWidth="1.5"
          />
          <circle cx="12" cy="9" r="2.5" className={collected ? 'fill-white' : 'fill-slate-500'} />
        </svg>
      )}

      {/* The name sits under the icon, where it cannot cover the landmark
          above it, and it is small: the drawn icons carry most of the meaning
          and the Guide tab has the full list. */}
      <span
        className={`max-w-20 truncate rounded px-1 text-[10px] leading-tight font-medium ${
          collected ? 'bg-amber-400 text-amber-950' : 'bg-white/85 text-slate-700'
        }`}
      >
        {name}
      </span>
    </button>
  );
}
