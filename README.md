# Regional growth intelligence map

An interactive map of Connected Places Catapult's ten priority regions: their investment sites, region-wide programmes, and innovation and R&D assets. The build brief is in `CLAUDE.md`.

## Run it

```
npm install
npm run dev        # local development
npm run build      # validates the data, type-checks, builds to dist/
npm run preview    # serves the built site
```

The build is static. A push to `main` deploys it to GitHub Pages (`.github/workflows/pages.yml`); in the repo settings, Pages source must be set to GitHub Actions. It also works on Vercel or Netlify (build command `npm run build`, output `dist`).

## Data

These files are the source of truth. The app reads them; nothing is hard-coded.

| File | What it holds |
|---|---|
| `data/regions.json` | The ten regions and their member councils |
| `data/schemes.json` | 89 schemes |
| `data/assets.json` | Universities, Catapult centres and research centres |

Run `npm run validate` before every commit. It checks every record against the schemas in `src/schema.ts`, checks IDs are unique, checks every region exists and every record has a source, and warns when a status date is missing or more than 6 months old.

## Scripts

| Command | What it does |
|---|---|
| `npm run boundaries` | Downloads ONS boundaries to `data/raw/` and rebuilds `public/data/regions.geojson` and `lads.geojson`. Writes `reports/boundaries.md`. |
| `npm run check-locations` | Geocodes each scheme's place and writes `reports/locations.md`. It never changes coordinates. |

Scripts that call the web use Node's built-in `fetch`. Behind a proxy, run them with `NODE_USE_ENV_PROXY=1`.

## Sources and licences

- Boundaries: Office for National Statistics, Open Government Licence v3.0. Contains OS data © Crown copyright and database right 2025.
- Basemap: OpenFreeMap, © OpenMapTiles, data from OpenStreetMap.
- Asset facts and coordinates: Wikidata (CC0) and OpenStreetMap via Nominatim (ODbL).
- Photos: Wikimedia Commons. Each photo's credit and licence is stored with the record and shown on its card.
