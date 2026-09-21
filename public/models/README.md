# Landmark models (task K1, for KrackedDev)

The Map tab draws a 3D city: the real shapes of KL Centre's buildings, from
OpenStreetMap, with a marker standing at each of the seven check-in spots.

Those markers are **placeholders** — a pillar with a disc. They are deliberately
plain, so nobody mistakes them for the real buildings. Your models replace them.

Drop a file here and the landmark it belongs to stops being a pillar.

## What to send

|           |                                                                        |
| --------- | ---------------------------------------------------------------------- |
| Format    | glTF binary, one `.glb` per landmark                                   |
| File name | the landmark's id, exactly: see the list below                         |
| Size      | 1.5 MB or less each (Draco compression is fine)                        |
| Detail    | about 25,000 triangles or fewer                                        |
| Texture   | one baked texture, 1024 × 1024 or smaller                              |
| Units     | metres, real size (Petronas really is 452 m tall)                      |
| Up        | +Y up, +Z towards the south, matching the app's scene                  |
| Origin    | the middle of the building at ground level, so it stands on the ground |
| Colour    | one material, so the app can grey it out before the stamp is earned    |

## The seven ids

| File                  | Landmark                                            |
| --------------------- | --------------------------------------------------- |
| `kl-sentral.glb`      | KL Sentral                                          |
| `merdeka-118.glb`     | Merdeka 118                                         |
| `petaling-street.glb` | Petaling Street (the gate is the recognisable part) |
| `abdul-samad.glb`     | Sultan Abdul Samad Building                         |
| `petronas.glb`        | Petronas Twin Towers                                |
| `klcc-park.glb`       | KLCC Park (the lake and fountain)                   |
| `kl-tower.glb`        | KL Tower                                            |

## Notes

- **You can start now.** Nothing in the app waits on these, and a missing model
  is just a pillar, so models can land one at a time.
- **Phones first.** A tourist opens this on mobile data, on a mid-range Android.
  Fewer triangles and one small texture beat a beautiful model nobody can load.
- **No photo-scanned meshes from Google Earth or Apple Maps.** Their licences do
  not allow it. Model from photographs or your own references.
- A grey and a gold version are not needed: the app tints the model.

Questions: Faris.
