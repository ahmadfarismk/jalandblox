import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LandmarkStamp from './LandmarkStamp';
import { SUN, themeFor } from './stampTheme';

const SLAB = "'Rockwell', 'Roboto Slab', 'Zilla Slab', 'Arvo', Georgia, serif";

/** The picture side of a stand-in postcard: sky, sun, ground and the landmark. */
export function PostcardScene({ place, className = '' }) {
  const theme = themeFor(place.id);
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: theme.sky }}>
      <span
        className="absolute top-[14%] right-[14%] aspect-square w-[16%] rounded-full"
        style={{ background: SUN }}
      />
      <span className="absolute inset-x-0 bottom-0 h-[20%]" style={{ background: theme.ground }} />
      <img
        src={place.iconColour}
        alt=""
        className="absolute bottom-[4%] left-1/2 w-[82%] -translate-x-1/2"
      />
    </div>
  );
}

/**
 * Shows the postcard's JPG preview (task D11). Until that file exists, it draws a
 * stand-in postcard instead of a broken image.
 *   variant="full"  scene on the left, stamp and address lines on the right
 *   variant="thumb" just the picture side, for small option cards
 */
export default function PostcardPreview({ src, place, variant = 'full', className = '' }) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(!src);
  const name = t(place.nameKey);
  const theme = themeFor(place.id);
  const thumb = variant === 'thumb';
  const shape = thumb ? 'rounded-xl' : 'rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.18)]';

  if (!failed) {
    return (
      <img
        src={src}
        alt={thumb ? '' : t('postcard.previewAlt', { place: name })}
        onError={() => setFailed(true)}
        className={`aspect-[210/148] w-full object-cover ${shape} ${className}`}
      />
    );
  }

  if (thumb)
    return (
      <PostcardScene place={place} className={`aspect-[210/148] w-full ${shape} ${className}`} />
    );

  return (
    <div
      role="img"
      aria-label={t('postcard.previewAlt', { place: name })}
      className={`grid aspect-[210/148] w-full grid-cols-[58%_1fr] overflow-hidden bg-[#FFFDF8] ${shape} ${className}`}
    >
      <PostcardScene place={place} />

      <div className="flex flex-col border-l border-dashed border-slate-300 p-[6%]">
        <div className="ml-auto w-[42%]">
          <LandmarkStamp place={place} kind="gold" tilt={4} />
        </div>
        <p className="mt-auto text-[9px] font-semibold tracking-[0.2em] text-slate-500 uppercase">
          Kuala Lumpur
        </p>
        <p
          className="mt-0.5 text-sm leading-tight font-extrabold"
          style={{ fontFamily: SLAB, color: theme.ink }}
        >
          {name}
        </p>
        <span className="mt-3 block h-px bg-slate-300" />
        <span className="mt-3 block h-px bg-slate-300" />
        <p className="mt-2 text-[9px] text-slate-400">{t('postcard.previewPending')}</p>
      </div>
    </div>
  );
}
