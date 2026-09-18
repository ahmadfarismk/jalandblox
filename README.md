# JalanKL

A phone web app that guides first-time tourists from KLIA into KL, around City Centre
landmarks, and rewards real visits with stamps and postcards.

The full plan lives in [docs/PLAN.md](docs/PLAN.md). Read it before starting any task.

## What you need

- [Node.js](https://nodejs.org) 22 or newer (includes `npm`)
- [Git](https://git-scm.com)

## Install and run

```bash
git clone https://github.com/ahmadfarismk/jalandblox.git
cd jalandblox
npm install
cp .env.example .env
npm run dev
```

Open the address it prints (usually http://localhost:5173). You should see three tabs at
the bottom: **Guide**, **Map** and **Passport**.

To try it on your phone, connect it to the same Wi-Fi and open the **Network** address that
`npm run dev` prints. (GPS needs https, so real check-in testing uses the hosted preview link.)

## Commands

| Command                | What it does                                          |
| ---------------------- | ----------------------------------------------------- |
| `npm run dev`          | Runs the app locally and reloads when you save        |
| `npm run build`        | Makes the production version in `dist/`               |
| `npm run preview`      | Serves the built `dist/` folder to check it           |
| `npm run lint`         | Checks the code for mistakes (ESLint)                 |
| `npm run format`       | Tidies the formatting of every file (Prettier)        |
| `npm run format:check` | Checks formatting without changing files (used in CI) |
| `npm test`             | Runs the automatic tests once (Vitest)                |
| `npm run test:watch`   | Re-runs the tests every time you save                 |

Run `npm run format`, `npm run lint` and `npm test` before opening a pull request. The same checks
run automatically on GitHub for every pull request.

## Fake vs real functions (`VITE_USE_MOCKS`)

Screens call the shared functions in `src/core/` (section 8 of the plan). Real versions
live in `src/core/real/`, fake ones in `src/core/mocks/`.

**Always real (switch has no effect):** progress and settings. They save on the phone
(localStorage), so stamps and language survive a reload. Built in task F4.

**Switched by `VITE_USE_MOCKS` in `.env`:** location, check-in and the backend.
The real location (F6) is built. Check-in (F7) and the backend (F10) are not yet.

- `VITE_USE_MOCKS=true` uses the fakes. This is the default and what you want for now.
- `VITE_USE_MOCKS=false` uses the real versions. They are not built yet and will throw a
  "not built yet" error until tasks F7 and F10 are done.

Restart `npm run dev` after changing `.env`.

How the fakes behave:

| Function                        | Fake behaviour                                                   |
| ------------------------------- | ---------------------------------------------------------------- |
| `getPosition()`                 | After 0.8 s, a fixed spot near Sultan Abdul Samad, 18 m accuracy |
| `distanceTo(placeId, position)` | Real maths. Returns `null` if the place has no coordinates yet   |
| `checkIn(placeId)`              | After 2 s, saves a gold stamp and returns `{ result: 'gold' }`   |
| `submitReview(review)`          | After 1 s, returns `{ ok: true, postcardQueued: true }`          |
| `watchPosition(callback)`       | Sends the same fake spot now and every 3 s                       |
| `getPermissionState()`          | Always `'granted'`                                               |

**Try them in the browser console.** While `npm run dev` is running, every core and data
function is available on `window.jalankl`, for example:

```js
await jalankl.checkIn('petronas');
jalankl.getProgress();
jalankl.getPlaces();
jalankl.loadSampleProgress(); // fills in sample stamps to build screens with
jalankl.resetProgress(); // back to a fresh start (keeps language)
```

## Testing real GPS outdoors

GPS only works on https, so use a Cloudflare preview link (or the live site) on your phone,
not the laptop address.

1. Open `<preview link>/debug/location` on your phone. This hidden page always uses the
   real GPS, even when `VITE_USE_MOCKS=true`.
2. Tap **Start live GPS** and allow location.
3. Stand on a spot and tap **Save this spot as my test point** (or paste coordinates from
   Google Maps, like `3.14861, 101.69444`).
4. Walk to a spot a known distance away (measure it with Google Maps' "Measure distance")
   and compare with **Distance now**. It should match within the accuracy shown.
5. **Take best-of-3 reading** shows what check-in will use.

## Folder guide

| Folder         | Owner         | What goes here                                        |
| -------------- | ------------- | ----------------------------------------------------- |
| `src/core/`    | Faris         | Progress, location, check-in, settings, backend calls |
| `src/guide/`   | Syakir        | Welcome, arrival, guide, place, journey, map, learn   |
| `src/rewards/` | Danial        | Passport, review, postcard sent                       |
| `src/data/`    | Danial        | Places, routes, arrival, learn, languages             |
| `src/shared/`  | Everyone (PR) | Button, Card, Avatar, StampBadge                      |
| `public/`      | —             | App icons, landmark icons and photos, signage photos  |
| `supabase/`    | Faris         | Database setup and the send-postcard function         |

Screens never touch localStorage, GPS or Supabase directly. They import from `src/core/`.
Screens never import JSON files directly. They use the helpers in `src/data/index.js`.
You can write imports as `@/core/progress` instead of `../../core/progress`.

**Sample data warning:** every `"TBC"` in `src/data/` is a fact still to be checked from
official sources or on the field day. The `order` values in `places.json` are placeholders too.

## Secrets

Never commit `.env`. It is already in `.gitignore`. Only `.env.example` (names, no values)
goes into GitHub.

## Hosting (Cloudflare)

The site is deployed by Cloudflare from this GitHub repo. Settings in the Cloudflare project:

| Setting        | Value                 |
| -------------- | --------------------- |
| Build command  | `npm run build`       |
| Deploy command | `npx wrangler deploy` |
| Variables      | `VITE_USE_MOCKS=true` |

`wrangler.jsonc` tells Cloudflare to serve the built `dist/` folder, and to send links
like `/passport` to the app. Its `name` must match the project name in Cloudflare.
Node 22 is picked from `.node-version`.

**Protect `main`:** on GitHub, go to Settings → Branches → Add rule for `main`, then
require a pull request with 1 approval and require the `CI / check` status to pass.
