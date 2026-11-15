# Regional growth intelligence map

An interactive map of Connected Places Catapult's ten priority regions: their investment sites, region-wide programmes, and innovation and R&D assets. The briefs are in `CLAUDE.md` and `IMPROVE.md`.

## Run it

```
npm install
npm run dev        # local development
npm run build      # validates the data, type-checks, builds to dist/
npm run preview    # serves the built site
npm run test:e2e   # builds, then runs the browser tests
```

The browser tests need Chromium once: `npx playwright install chromium`.

The build is static. A push to `main` deploys it to GitHub Pages (`.github/workflows/pages.yml`); in the repo settings, Pages source must be set to GitHub Actions. It also works on Vercel or Netlify (build command `npm run build`, output `dist`).

## Password screen

Set `SITE_PASSWORD` when building to switch on a password screen:

- GitHub Pages: add a repository secret called `SITE_PASSWORD` (Settings, Secrets and variables, Actions).
- Vercel or Netlify: add an environment variable called `SITE_PASSWORD`.
- Locally: `SITE_PASSWORD=something npm run build`.

**This is a deterrent, not security.** Only a hash of the password is in the page, but the data files are plain public files that anyone with the address can fetch. Everything in the data is public information. Do not put anything confidential in this repo.

## Data

These files are the source of truth. The app fetches them when the page loads; nothing is hard-coded and a data change never changes the app code.

| File | What it holds |
|---|---|
| `data/regions.json` | The ten regions, their member councils, boundary source and National Wealth Fund partnership |
| `data/schemes.json` | Schemes, each with sources, a change history and a last-checked date |
| `data/assets.json` | Universities, Catapult sites and research centres |

Run `npm run validate` before every commit. It checks every record against the schemas in `src/schema.ts`, checks IDs are unique, checks every region exists and every record has a source, and warns when a status date is missing or more than 6 months old.

Rules: every record needs a source; never invent figures, dates or locations; never delete a scheme; record every change in the scheme's `history`.

## Scripts

| Command | What it does |
|---|---|
| `npm run boundaries` | Downloads ONS boundaries to `data/raw/` and rebuilds `public/data/regions.geojson` and `lads.geojson`. Writes `reports/boundaries.md`. |
| `npm run catapults` | Rebuilds the Catapult sites in `data/assets.json` from the official network map at catapult.org.uk, geocoded by postcode. |
| `npm run check-locations` | Geocodes each scheme's place and writes `reports/locations.md`. It never changes coordinates. |

Scripts that call the web use Node's built-in `fetch`. Behind a proxy, run them with `NODE_USE_ENV_PROXY=1`.

## Reports

- `reports/boundaries.md`: boundary build and cross-check.
- `reports/locations.md`: location check.
- `reports/round-2.md`: what changed in round 2, what could not be verified and open data conflicts.

## Sources and licences

- Boundaries: Office for National Statistics, Open Government Licence v3.0. Contains OS data © Crown copyright and database right 2025.
- Basemap: OpenFreeMap, © OpenMapTiles, data from OpenStreetMap.
- Catapult sites: Catapult Network map of locations; coordinates from postcodes.io.
- Other asset facts and coordinates: Wikidata (CC0) and OpenStreetMap via Nominatim (ODbL).
- Photos: Wikimedia Commons. Each photo's credit, date and licence is stored with the record and shown on its card.
