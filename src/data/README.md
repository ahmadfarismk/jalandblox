# src/data (owner: Danial)

All place, route, arrival and learn content, plus the English and Malay text. Screens read it only through `index.js`.

## Conventions

- **`verified`**: `"2026-09-18 (desk)"` means checked against the listed `sources` at a desk. On field day, replace it with the plain date the route was walked or the place was visited, e.g. `"2026-10-05"`.
- **`TBC`**: a fact nobody has confirmed yet. Helpers turn `TBC` into `null`, so screens never show it. Exceptions: the TBC texts in `arrivalOptions.airport-bus` and `privacy.*` do show on screen until they're filled.
- **Walking times** come from OpenStreetMap foot routing (routing.openstreetmap.de) and are estimates. The field day confirms them.
- **Line colours** come from Wikipedia's Klang Valley transit template, which copies the official colours. Check them against real station signs on field day.
- `npm test` checks the data: both languages have the same keys, every route ends in a check-in at its destination, walking cards are 12 minutes or less, and so on. It also prints how many TBCs are left (now: routes 24, arrival 4, learn 3, en 5, ms 5).

## Additions to the plan's section 7 shapes (tell Faris and Syakir)

Nothing was removed or renamed. These are additions:

| File                     | Addition                                                      | Why                                                                                         |
| ------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| places.json              | `hoursKey`                                                    | The detail screen shows an hours note, but the plan's shape had no key for it.              |
| routes.json              | board steps: `at` (boarding station); ride steps: `alightAt`  | So the Journey screen can say "Board at KJ15 KL Sentral" / "Get off at KJ10 KLCC".          |
| routes.json              | `from: "klia"` on the airport card                            | KLIA is a start point but not a check-in spot.                                              |
| arrival.json             | `whyKey`, and `routeId: null` for the non-recommended options | Only the recommended option has a route card (12 cards total).                              |
| learn.json               | block `{ "type": "lines" }`                                   | Means "show the line list from `getLines()` here", with colour chips.                       |
| lines.json (new)         | line id, code, kind, colour, nameKey                          | Board steps point at it via `line`.                                                         |
| nationalities.json (new) | 243 ISO country codes                                         | For the Welcome picker. Show names with `Intl.DisplayNames`, so no translations are needed. |
| locales                  | `meta.name`, `meta.dir`, `meta.dateLocale`                    | The language picker lists each file by its own name; dates format per language.             |

Extra helpers in `index.js`: `getRoutesTo(placeId)`, `getLearnTopic(id)`, `getLines()`, `getLine(id)`, `getPostcardPreview(placeId)`, `getNationalities()`, `getLanguages()`, `localeResources` (for the i18next setup), `isTBC()`.

## Suggested visiting order

KL Sentral (1) → Merdeka 118 (2) → Petaling Street (3) → Sultan Abdul Samad (4) → Petronas (5) → KLCC Park (6) → KL Tower (7).

This order gives three short walks (118 → Petaling St → Merdeka Square), one direct LRT hop to the towers, and ends at KL Tower. It also makes **Sultan Abdul Samad → Petronas a single route card**, which is exactly the plan's week-4 field test ("Merdeka Square to Petronas").

## Things the research turned up (please read)

1. **Merdeka 118 was renamed Menara Merdeka Maybank on 28 July 2026** (Maybank press release). Most of the tower is still closed to visitors; only the Park Hyatt is open. The app keeps the name "Merdeka 118" and mentions the new name in the story. Decide as a team whether it stays a check-in spot.
2. **Sultan Abdul Samad Building reopened on 1–2 February 2026** after restoration, with galleries and cafés, open daily 8 am–10 pm (TheSmartLocal, 5 Feb 2026). The plan's older notes may assume it's closed.
3. **Bank cards can't be tapped at Rapid KL gates yet.** Prasarana announced open payment in May 2026, still in the award stage. Touch 'n Go or a token is needed. KLIA Ekspres gates do take credit cards.
4. **KL Tower is a 17–25 minute uphill walk from every station**, so the KLCC Park → KL Tower card is a car (e-hailing) card, and the KL Sentral → KL Tower card uses the monorail plus the walk. Check both on field day.
5. The KLIA Ekspres FAQ calls KL Sentral's LRT station "KJ24", but every other source says KJ15. Confirm on the platform sign.
6. Could not read (bot protection): kltower.com.my, myrapid.com.my FAQ, touchngo.com.my card pages. The facts that depend on them are marked in the sources, or left out.

## Fact log

| Fact                           | Value used                                                                                                             | Source                                                                | Status                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------ |
| KLIA Ekspres fare              | RM55 adult one way                                                                                                     | kliaekspres.com/products-fares/klia-ekspres                           | Official, 18 Sep 2026                      |
| KLIA Ekspres time              | 28 min T1, 33 min T2; every 20 min; 05:00–00:00 from KL Sentral                                                        | same + KLIA Ekspres FAQ                                               | Official                                   |
| KLIA Transit                   | RM55; 39 min from T2; stops Salak Tinggi, Putrajaya & Cyberjaya, Bandar Tasik Selatan                                  | kliaekspres.com/products-fares/klia-transit                           | Official                                   |
| Airport bus                    | TBC                                                                                                                    | only reseller listings found (about RM13, about 75 min)               | **TBC**: find an operator site             |
| E-hailing from KLIA            | price in app                                                                                                           | none                                                                  | **TBC**: pick-up point on field day        |
| KJ line stations               | KJ15 KL Sentral, KJ14 Pasar Seni, KJ13 Masjid Jamek, KJ12 Dang Wangi, KJ11 Kampung Baru, KJ10 KLCC; KJ1 Gombak         | Wikipedia Kelana Jaya Line; OSM                                       | Desk                                       |
| Kajang line                    | KG15 Muzium Negara → KG16 Pasar Seni → KG17 Merdeka; ends at Kajang                                                    | Wikipedia; OSM                                                        | Desk                                       |
| Monorail                       | MR1 KL Sentral → MR8 Bukit Nanas (7 stops); ends at Titiwangsa (MR11)                                                  | Wikipedia KL Monorail; OSM                                            | Desk                                       |
| KL Sentral → Muzium Negara MRT | 240 m covered walkway into the MRT paid area                                                                           | Wikipedia Muzium Negara station; KLIA Ekspres FAQ ("about 5 minutes") | Desk                                       |
| KLCC station → towers          | underground walkway to Suria KLCC                                                                                      | Wikipedia KLCC LRT station                                            | Desk                                       |
| Merdeka MRT exits              | Entrances A and B on Jalan Hang Jebat                                                                                  | Wikipedia Merdeka MRT station                                         | Desk                                       |
| Pasar Seni LRT exits           | Jalan Tun Tan Cheng Lock and Jalan Sultan Mohamed                                                                      | Wikipedia Pasar Seni station                                          | Desk                                       |
| Petronas Skybridge hours       | Tue–Sun & PH 9 am–10:30 pm (last entry 9:30 pm); 2nd/4th/5th Monday 9 am–8 pm; non-Malaysian adult from RM127          | petronastwintowers.com.my admission page                              | Official                                   |
| Lake Symphony shows            | evening, 8 pm to about 10 pm                                                                                           | suriaklcc.com.my esplanade page                                       | Official                                   |
| KLCC Park hours                | not stated in the app (the mall page lists 10 am–10 pm, which may be the mall's hours)                                 | suriaklcc.com.my                                                      | **TBC**                                    |
| Sultan Abdul Samad hours       | daily 8 am–10 pm                                                                                                       | TheSmartLocal (5 Feb 2026)                                            | Secondary: confirm on site                 |
| KL Tower hours                 | "check kltower.com.my"                                                                                                 | official site blocked                                                 | **TBC**                                    |
| Coordinates                    | 7 spots                                                                                                                | Wikipedia coordinates / OpenStreetMap                                 | Desk: set real standing spots on field day |
| radius_m                       | 90–200 m desk guesses (bigger for towers, the park and the station)                                                    | none                                                                  | **Tune on field day**                      |
| Walk times                     | 118→Petaling 770 m / 10 min; Petaling→Samad 720 m / 10 min; Petronas→Park 440 m / 6 min; Park→KL Tower 1.9 km / 25 min | routing.openstreetmap.de                                              | Estimate                                   |
| Exit and signage photos        | none yet                                                                                                               | none                                                                  | **TBC**: field day                         |
