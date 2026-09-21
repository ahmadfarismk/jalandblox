/**
 * The key under the map (task S13).
 *
 * Two parts: what a landmark's colour means (the same on both maps), and what
 * the city's colours mean (the 3D map only, where parks, water and roads are
 * drawn). The swatches use the map's real colours from cityLayers.js, so the
 * key can never drift from the map.
 */
import { useTranslation } from 'react-i18next';
import { COLOURS, MARKER_GOLD, MARKER_GREY, YOU_ARE_HERE } from '../mapColours';

const hex = (colour) => `#${colour.toString(16).padStart(6, '0')}`;

function Swatch({ colour, round = false }) {
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: hex(colour) }}
      className={`size-3 border border-black/10 ${round ? 'rounded-full' : 'rounded-xs'}`}
    />
  );
}

export default function MapLegend({ showCity, showYou }) {
  const { t } = useTranslation();

  const items = [
    { key: 'legendGrey', colour: MARKER_GREY, round: true, fallback: 'Not visited yet' },
    { key: 'legendColour', colour: MARKER_GOLD, round: true, fallback: 'Stamped, shown in colour' },
    ...(showYou
      ? [{ key: 'you', colour: YOU_ARE_HERE, round: true, fallback: 'You are here' }]
      : []),
    ...(showCity
      ? [
          { key: 'legendBuilding', colour: COLOURS.buildingMid, fallback: 'Building' },
          { key: 'legendRoad', colour: COLOURS.roadBig, fallback: 'Main road' },
          { key: 'legendWater', colour: COLOURS.water, fallback: 'River or lake' },
          { key: 'legendPark', colour: COLOURS.green, fallback: 'Park' },
        ]
      : []),
  ];

  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-2">
          <Swatch colour={item.colour} round={item.round} />
          {t(`map.${item.key}`, item.fallback)}
        </li>
      ))}
    </ul>
  );
}
