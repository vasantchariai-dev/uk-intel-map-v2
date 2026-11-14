# Regional intelligence map: build brief

This file is the brief for Claude Code. Read all of it before writing code. Work in the phases in section 10 and stop at the end of each phase so I can review.

## 1. Purpose

An interactive map for Connected Places Catapult's Local Growth team. It shows our ten priority regions, the schemes in each one and what we know about them. It answers questions like:

- what's happening in this region, and where?
- which schemes involve innovation, growth or commercialisation?
- what's stuck, at risk or waiting on a decision?
- what don't we know yet?

Primary user: me (Director of Local Growth). Secondary: my team, in briefings and before visits to places. It must work on a laptop screen and be usable on a phone.

## 2. What's in this repo already

- `data/regions.json`: 10 priority regions. Each one has its member local authority districts (ONS names), the type of body, sources for governance papers, and notes on what to watch.
- `data/schemes.json`: 89 schemes, compiled 14 November 2026. Each one has a type, themes, value, stage, status, unknowns, approximate coordinates, sources and a confidence level. The vocabularies are listed in `_meta.vocab`.

**These two files are the source of truth.** The app reads them. Never hard-code scheme content in components.

## 3. Stack

- **Map:** MapLibre GL JS. It's open source and needs no API token.
- **Basemap:** a free vector style with no key, such as OpenFreeMap "positron". Fall back to CARTO Positron raster tiles. Keep it muted so the region outlines and markers stand out. The attribution must be visible.
- **App:** Vite with TypeScript. No framework unless one is clearly needed; if you need one, use Preact. Keep dependencies small.
- **Data tooling:** Node scripts in `scripts/`. Use mapshaper (npm) for boundary work.
- **Validation:** zod schemas in `src/schema.ts`. These must match `_meta.vocab`.
- **Hosting:** a static build, deployed to Vercel or Netlify. Add a simple password screen controlled by an environment variable. It's a deterrent, not real security; everything in the data is public information.

## 4. Boundaries

Build `public/data/regions.geojson`: one polygon or multipolygon per region, dissolved from its member districts.

1. **Source:** ONS *Local Authority Districts (December 2025) Boundaries UK BGC* (generalised to 20m). It covers England, Scotland, Wales and Northern Ireland in one file. Find it on the ONS Open Geography Portal or data.gov.uk. Download the GeoJSON or GeoPackage in `scripts/fetch-boundaries.mjs`, and save the raw file in `data/raw/` (gitignored).
2. **Match:** match each region's `lads` names against `LAD25NM`. Fail loudly if any name doesn't match, and print the closest candidates. Expect small fixes like "Glasgow City" and "Newcastle upon Tyne". Don't guess silently.
3. **Dissolve and simplify:** use mapshaper to dissolve by region, simplify to about 10% (keep shapes), set precision to 0.0001, and write `regions.geojson` with properties `id`, `name`, `body`, `type`, `nation`.
4. **Cross-check the English combined authorities** against ONS *Combined Authorities (December 2025) Boundaries EN*. Report any mismatch; don't fix it silently.
5. **Special cases** (already encoded in `regions.json`):
   - **Belfast:** the boundary is the Belfast Region City Deal, which is six councils, not Belfast City Council alone.
   - **Cardiff:** the boundary is the South East Wales Corporate Joint Committee, which is ten councils.
   - **Glasgow City Region:** eight councils.
   - **West Midlands:** constituent members only. Some schemes, such as the Gigapark at Coventry Airport and the East Midlands Freeport site at East Midlands Airport, sit just outside their region's boundary. They should still show and still belong to that region. Don't "correct" them.
6. Also write `public/data/lads.geojson`, containing only the member districts. Use it for an optional "show council boundaries" layer with thin lines.

Commit the build script and its outputs. Running the script again must give the same result.

## 5. Data model

Build zod schemas from `data/schemes.json` `_meta.vocab`. Main fields:

| Field | Notes |
|---|---|
| `id` | Stable slug, region prefix. Never change it once published. |
| `region` | Region ID from `regions.json` |
| `name`, `aliases` | Aliases matter: papers use many names for one scheme. Search must cover them. |
| `type` | fund, capital_project, programme, designation, transport, strategy, power, governance, private_investment |
| `themes` | Multi: innovation, growth, commercialisation, transport, housing, energy, culture, skills, nature, governance |
| `value_gbp_m`, `value_note` | Number in £ millions only where one headline figure is clear. Always display `value_note` when present. Never add up values across schemes without a caveat, because they overlap: for example, an Investment Zone contains its sites. |
| `stage` | proposed, pipeline, business_case, approved, delivering, at_risk, complete, adopted |
| `status`, `status_date` | Latest known position and date (ISO) |
| `unknowns` | What we don't know. Show this prominently; it's often the most useful part. |
| `lat`, `lng`, `loc_precision`, `place` | Coordinates are **approximate**. See section 6. |
| `sources` | Title and URL. Always shown and always clickable. |
| `confidence` | high (primary paper read), medium (official or trade press), low (secondary or AI summary). |

**Add these during the build:**

- `parent` (optional ID): links a site to its parent designation, such as `wm-bkq` to `wm-investment-zone`, or `ne-forth-yards` to `ne-mdz-newcastle-gateshead`. Infer the obvious links, then list them for me to confirm.
- `history`: an array of `{date, change, source}`. This is the change log for the "what's moved" view.
- `last_checked`: an ISO date.

## 6. Locations

- Each `lat`/`lng` was entered by hand and is approximate. Write `scripts/check-locations.mjs`:
  - geocode each `place` with Nominatim (respect its usage policy: one request a second, with a proper User-Agent) or postcodes.io where a postcode is known;
  - flag any scheme more than 2km from its geocode (for `site` precision) or outside its region polygon by more than 10km;
  - write a report to `reports/locations.md`. **Don't overwrite coordinates automatically.** I'll review them.
- Display by precision:
  - **site:** a normal marker;
  - **area:** a marker with a soft halo;
  - **region:** don't put it on the map. List it in the region panel under "Region-wide".

## 7. Interface

GOV.UK-influenced: plain, high contrast, sentence case, British English, no jargon in labels. Use system fonts or GDS Transport if licensed; otherwise Arial or Helvetica.

### 7.1 Layout

- **Desktop:** map on the left (about 65%), side panel on the right. **Mobile:** full-screen map with a bottom sheet.
- **Header:** title "Regional intelligence map", a "Data last checked: <date>" line, and a search box.

### 7.2 Map

- **Starting view:** fit all ten regions. These run from Glasgow and Belfast to Cardiff and the Tees, so make sure the starting view includes all of them on a 1366×768 screen.
- **Priority regions:** filled with a light tint and a strong outline. Each region gets its own colour from a colour-blind-safe palette of ten. Everywhere else stays plain basemap; don't shade it.
- Region labels at low zoom.
- **Hover a region:** highlight it. **Click a region:** zoom to it and open the region panel.
- **Scheme markers:** coloured by `type` (keep this to about seven distinguishable colours), with the shape or icon showing `stage` where possible. `at_risk` must stand out (red ring).
- Clustering at low zoom.
- **Click a marker:** open the scheme card.
- **Layer toggles:** council boundaries; parent zones (where a designation has a site polygon later); region-wide items shown as badges.

### 7.3 Side panel: three modes

1. **Overview (default):**
   - filter bar: region (multi-select), theme (multi), type (multi), stage (multi), confidence, and "has unknowns";
   - a results list that updates with the filters and the map view;
   - each row shows name, region, stage chip, value_note in short, and status_date.
2. **Region panel:**
   - body, type and nation;
   - counts by stage;
   - top themes;
   - the `watch_notes`;
   - the "Region-wide" items;
   - a list of schemes;
   - links to the governance sources.
3. **Scheme card:**
   - name and aliases;
   - region; type; themes as tags; stage;
   - value and value_note;
   - status with date;
   - **"What we don't know"** box (unknowns);
   - parent and child links;
   - history timeline;
   - sources (clickable);
   - a confidence badge with a tooltip explaining it;
   - "Copy summary" button: copies a 3-line plain-text brief for pasting into emails.

### 7.4 Other views

- **What's moved:** all history entries across schemes, newest first, filterable by region. Before any history exists, use `status_date`.
- **Compare regions:** a table with one row per region: number of schemes, number at risk, Investment Zone (yes or no), freeport (yes or no), MDC or MDZ (yes or no), headline innovation programme, and watch notes.
- **Print/export:** the current filtered list as CSV, and a print stylesheet for the region panel (a one-page region brief).

### 7.5 Behaviour

- Store filters, the selected region and the selected scheme in the URL hash, so I can share a link to a view.
- Search covers name, aliases, place and status text (fuzzy; use Fuse.js or a small custom matcher).
- **Accessibility:**
  - everything works by keyboard;
  - the list mirrors the map, so nothing is map-only;
  - visible focus states;
  - colour is never the only signal: stage also appears as a text chip.
- **Performance:** first load under 1MB of JS and data, gzipped. Boundaries must be simplified.

## 8. Updating the data

The map needs to stay current without me hand-editing JSON.

1. **Manual add or edit:** run `npm run validate` before every commit. It runs the zod checks on all records, checks for unique IDs, checks that every region exists and that every scheme has at least one source, and warns when `status_date` is more than 6 months old.
2. **Proposed updates folder:** `updates/YYYY-MM-DD-<region>.json` holds proposed changes (new schemes, or patches with `id`, `changes`, `source`, `evidence`). `npm run apply-updates` shows a diff and asks before merging. On merge it appends to `history` and sets `last_checked`.
3. **Weekly agent (later phase):** a separate scheduled agent reads council and combined authority papers through the browser and writes files into `updates/`. It never writes directly to `schemes.json`. `regions.json` → `governance_sources` already records the quirks of each site:
   - ModernGov pages: minutes are sometimes HTML, sometimes PDF;
   - WMCA: a bot check that clears in a few seconds;
   - Glasgow: Northgate system, documents through `viewSelectedDocument.asp`;
   - Cardiff Capital Region and Tees Valley: WordPress PDFs.

   **Working method for PDFs** (used successfully in the browser): fetch the PDF bytes on the same origin, inflate the FlateDecode streams with `DecompressionStream('deflate')`, and pull the text out of the Tj/TJ operators. Fonts without ToUnicode maps worked fine.
4. **Rules for any update:**
   - every change must have a source URL;
   - never delete a scheme: set stage to `complete`, or add a `withdrawn` note in history;
   - restricted or exempt information goes in `unknowns` as "exempt", never guessed.

## 9. Known gaps to fill (phase 4)

- **West Yorkshire:** the May 2026 investment prospectus lists 40 investment-ready sites. Extract them.
- **North East:** extract the investment prospectus sites. Add the Riverside Sunderland MDZ, Port of Blyth and the Durham Innovation District.
- **Tees Valley:** Investment Zone sites and sector focus need confirming. Add the Middlesbrough and Hartlepool screen and digital schemes.
- **Glasgow:** name the six Investment Zone projects and the two Regional Projects of Scale.
- **South Yorkshire:** current Investment Zone envelope and sites; Gateway station, Rotherham.
- **West Midlands:** list of the eleven red-rated Investment Programme schemes; Metro extension to the Sports Quarter; Central Heart.
- **Belfast:** the rest of the 20+ City Deal projects (tourism, infrastructure, digital).
- **Cardiff Capital Region:** Investment Zone sites once published.
- **All regions:** Investment Zone and freeport tax site polygons. GOV.UK publishes tax site maps; add them as a `zones.geojson` layer with links to their parent scheme.

## 10. Phases

Stop for review at the end of each phase. Tell me what you built, what you assumed, and what failed.

1. **Boundaries and skeleton:**
   - Vite app, MapLibre map, regions.geojson built and drawn with outlines and labels;
   - validation script;
   - deployed preview.
   - **Acceptance:** all ten regions visible and correct; Belfast shows six councils, Cardiff ten, Glasgow eight.
2. **Schemes on the map:**
   - markers, clustering, scheme card and region panel;
   - region-wide items in the panel;
   - location check report.
   - **Acceptance:** all 89 schemes reachable from the list; no scheme map-only; the location report is generated.
3. **Filters, search, URL state, compare view, export, password screen.**
   - **Acceptance:** a filtered view survives a reload via the URL; CSV export matches the list.
4. **Data deepening:**
   - work through section 9;
   - add `parent` links and `zones.geojson`.
   - **Acceptance:** each region has at least 12 site-level schemes; every new record has a source.
5. **Update pipeline:**
   - `updates/` folder, apply-updates script, "what's moved" view.
   - Write `AGENT.md` describing exactly how the weekly agent should produce update files.

## 11. Don'ts

- Don't add a backend or database. Static files only.
- Don't use Mapbox or any service that needs a paid token.
- Don't invent figures, dates or locations. If something is missing, leave it empty and say so in `unknowns`.
- Don't sum values across regions or schemes without a visible caveat.
- Don't restyle into a dashboard with charts everywhere. It's a map with good cards.
- Don't over-engineer. Choose the plainest option that meets the acceptance checks.
