// Colours for each landmark's postage stamp (visual design only, not facts).
// frame = stamp border, sky = scene background, ground = scene floor, ink = name banner text.
export const STAMP_THEMES = {
  'kl-sentral': { frame: '#8DBBE6', sky: '#DDEBF8', ground: '#C3D8EE', ink: '#1F4E79' },
  'merdeka-118': { frame: '#74C8CB', sky: '#DDF3F3', ground: '#BFE3E4', ink: '#17656C' },
  'petaling-street': { frame: '#F39A67', sky: '#FDE7D3', ground: '#F7CDA9', ink: '#B3321E' },
  'abdul-samad': { frame: '#F2A097', sky: '#FCE4DA', ground: '#F4C7B8', ink: '#A1352A' },
  petronas: { frame: '#9FB4EA', sky: '#E2E9FA', ground: '#C7D3F2', ink: '#2D4896' },
  'klcc-park': { frame: '#8FCB8B', sky: '#E2F3DC', ground: '#BFE3B4', ink: '#2A7439' },
  'kl-tower': { frame: '#B9A1E2', sky: '#EDE5FA', ground: '#D6C8F0', ink: '#573897' },
};

export const DEFAULT_THEME = {
  frame: '#D4D4D8',
  sky: '#F4F4F5',
  ground: '#E4E4E7',
  ink: '#3F3F46',
};

export const SUN = '#F26B3A';

export const themeFor = (placeId) => STAMP_THEMES[placeId] ?? DEFAULT_THEME;
