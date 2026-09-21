/**
 * Credit for the map data (task F14).
 *
 * The building shapes in the 3D city, and the nearby attractions list, both
 * come from OpenStreetMap. Its licence (ODbL) requires this credit wherever
 * that data is shown, the same way the landmark photos carry their credits.
 * Do not remove it when restyling.
 */
import { useTranslation } from 'react-i18next';

export default function MapAttribution({ className = '' }) {
  const { t } = useTranslation();
  return (
    <p className={`text-xs text-slate-500 ${className}`}>
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-slate-300"
      >
        {t('attribution.osm')}
      </a>
    </p>
  );
}
