// Small formatting helpers for the rewards screens.

/** "3 Oct 2026" / "3 Okt 2026". Returns '' for a missing or broken date. */
export function formatDate(iso, dateLocale) {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(dateLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** Country name in the current language, or null if the code isn't a real one. */
export function countryName(code, lang) {
  if (typeof code !== 'string' || !/^[A-Z]{2}$/.test(code)) return null;
  try {
    return new Intl.DisplayNames([lang], { type: 'region', fallback: 'none' }).of(code) ?? null;
  } catch {
    return null;
  }
}

/** Loose check: something@something.tld, no spaces. The server checks again. */
export function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
