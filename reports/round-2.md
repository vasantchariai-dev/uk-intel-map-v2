# Round 2 report

Written 15 November 2026. It covers the work in `IMPROVE.md`: what changed, what could not be verified, and the data conflicts still open.

Register now: 109 schemes (was 89) and 81 assets (was 59).

## What changed

### 1. Blank map on first load

- The map opens on a safe view over the UK, then fits all ten regions after load.
- Padding is clamped: top plus bottom never exceeds 60% of the canvas height, left plus right never exceeds 60% of its width.
- The map refits when its size changes or the device rotates, while nothing is selected.
- "All regions" uses the same fit and always restores the full view.
- Browser tests load the page at 1366×768, 1920×1080, 390×844 and 768×1024 and check the map centre is inside the UK, all ten regions are in view and there is no "cannot fit" warning.

### 2. Boundaries

- No boundary was changed.
- Each region has a `boundary_source` and `boundary_note`, shown in the region panel with the list of councils.
- The Belfast panel says it covers the city deal area, from Ballymena to Newry, not Belfast city alone.
- Council boundaries switch on automatically when a region is opened. The "Show council boundaries" toggle overrides this.

### 3. Catapult network

- The old hand-keyed list of 10 sites is replaced by the official list, read from the map on catapult.org.uk by `npm run catapults`.
- The page holds 69 locations. 28 are inside the ten regions. Four more are shown as "just outside": MTC Coventry (Ansty Park), NMIS Digital Process Manufacturing Centre (Irvine), HVM Catapult Baglan and Satellite Applications Catapult Leicester.
- The brief counted 29 inside the regions. That count includes MTC Coventry, which is 1.5km outside the boundary and is flagged as nearby.
- Each site has `catapult`, `centre`, `address`, `nearby` and a source. Coordinates are postcode centres from postcodes.io.
- "Compound Semiconductor Applications Catapult" is now "Semiconductor Catapult", as the official page names it.
- Connected Places Catapult Birmingham (STEAMhouse, Belmont Row) has its own green "CPC" marker.
- There is a filter by Catapult, a "Catapult network" layer toggle and a count in each region panel.
- Answers to the brief's questions: the HVM Catapult "Birmingham" site is the Catapult's own office at iCentrum, Holt Street, not a named centre. NMIS Sheffield exists on the official map, at Sheffield Olympic Legacy Park.

### 4. National Wealth Fund

- `nwf_partnership` added to regions. Wave 1 (21 October 2025): Glasgow City Region, West Midlands, West Yorkshire. Wave 2 (7 September 2026): South Yorkshire, North East, Cardiff Capital Region.
- `nwf_support` added to Clyde Metro, Greenpower Park (`wm-gigapark`), West Yorkshire Mass Transit and the Sports Quarter. Both announcements were read in full.
- Badges show in the region list, region panel, scheme rows and cards. There is an "NWF-supported" filter and a column in the compare view.
- A `corridor` field records prospectus groupings and shows on the scheme card.
- West Midlands: 16 new records from the WMCA Investment Prospectus 2025 and other official pages (see section 5).
- West Yorkshire: four new records from the March 2026 infrastructure pipeline, completing its six "nationally significant projects": Leeds South Bank, Bradford City Village and Southern Gateway, Wakefield city centre, and Calderdale New Garden Communities and Clifton Business Park. Mass Transit and Huddersfield Station to Stadium were already on record.

### 5. West Midlands

New records, each read from an official source:

| ID | Source |
|---|---|
| `wm-smithfield`, `wm-curzon-street`, `wm-digbeth`, `wm-arden-cross`, `wm-metro-sports-quarter`, `wm-paradise`, `wm-ladywood`, `wm-tyseley`, `wm-city-centre-south`, `wm-portersfield`, `wm-west-bromwich`, `wm-wolverhampton-city-centre`, `wm-m6-junction-10` | WMCA Investment Prospectus 2025 |
| `wm-central-heart` | Invest West Midlands, 10 March 2026 |
| `wm-futures-fund` | Invest West Midlands, 19 May 2026 |
| `wm-lipf` | WMCA, 19 March 2026 |

Corrections:

- `wm-sports-quarter`: value set to unknown. All figures are in `value_note` with their sources.
- `wm-bkq`: £4.2bn GDV added from the prospectus. The site area conflict stays in `unknowns`.
- `wm-bemdc`: settled against SI 2026/405. The Order was made on 14 April 2026 and came into force on 11 May 2026, so the corporation is established. "Expected by 2027" is out of date.
- `parent: "wm-bemdc"` set on the Sports Quarter, Knowledge Quarter, Curzon Street, Smithfield, Digbeth and Central Heart. This list matches WMCA's development corporation page.

### 6. Other data corrections

- Glasgow Investment Zone: value set to unknown; £160m, £190m and £500m recorded with their sources.
- `em-ratcliffe`: place changed to "Ratcliffe-on-Soar Power Station, Nottinghamshire". The false flag has gone.
- Eleven of the twelve places that could not be geocoded now have a geocodable place name. No coordinates were changed. The location report now has 2 flags (was 3) and 1 ungeocoded place (was 12).
- `bel-pbgf` and `bel-funding-clarity` are now region-wide. `bel-city-centre` is the only city centre marker.
- Images removed (13): `bel-gii`, `ne-gateshead-quays`, `em-step-fusion`, `sy-airport-city`, `tv-teesworks`, as asked, plus `wm-gigapark` (2006 photo of the airport), `wy-ferrybridge` (power station since demolished), `yny-york-central` (station, not the site), `wy-bradford-dhez` (the university, not the zone), `wy-lba-parkway` (the airport, not the station), `gcr-amids` (the airport), `em-freeport` (the airport) and `ccr-aberthaw` (2004).
- Images kept (8), each with a caption, year and licence: Coventry station, Mell Square, Ratcliffe-on-Soar, Litchurch Lane Works, Leeds General Infirmary, Drax, Darlington station and Cardiff Central.
- Missing status dates show "Date not known".

### 7. Phase 3

- Filters: region, theme, type, stage, confidence, "has unknowns", "NWF-supported" and Catapult. They are stored in the URL and survive a reload. The map shows only the filtered records.
- CSV export of the filtered list (schemes and assets). A test checks it matches the list.
- Compare regions view, with National Wealth Fund partnership, Catapult sites and Investment Zone value.
- "Copy summary" on each scheme card.
- Password screen, set by `SITE_PASSWORD` at build time. The README says it is a deterrent only.
- Every record has `history` and `last_checked`. "What's moved" lists history entries and each scheme's latest dated position, newest first, filterable by region.
- Scheme cards show parent and child links and a history timeline.
- "Print region brief" button with a print stylesheet.

### 8. Smaller fixes

- Data is fetched at runtime from `public/data/*.json`, not bundled.
- Mobile: the sheet starts at about 25% of the screen, with a drag handle and a "Show list" button.
- Search covers aliases. A test checks "Greenpower Park", "DSA" and "MDC".
- axe-core runs on seven views in the tests, with no serious or critical issues. One was found and fixed: MapLibre labelled every region label "Map marker".

## Not done

- **Innovation clusters layer (optional):** not built. The DSIT file is a 4MB spreadsheet of cluster estimates; I did not check whether it holds locations.
- **Prospectuses for the other eight regions:** not searched for. Only the West Midlands and West Yorkshire documents named in the brief were read.
- **West Yorkshire investment prospectus (May 2026):** not read. Only the March 2026 pipeline was.
- **Central Edge (WMCA prospectus):** not added. It is led partly by Staffordshire councils and most of it lies outside the West Midlands boundary.
- **Section 9 of `CLAUDE.md` (phase 4) and the update pipeline (phase 5):** not started.

## What I could not verify

- **Belfast boundary source:** the memorandum of understanding is on a site I could not reach. The link is recorded as given in the brief. The Glasgow and Wales sources were read and match.
- **The blank map:** I could not reproduce it. The old build fitted correctly at all four sizes in a headless browser. The live site is not reachable from the build environment.
- **Smithfield "first phase under way 2026" and the Digbeth occupier list:** only the WMCA prospectus was read. Trade press sources were not reachable.
- **Metro extension "£2.4bn":** the prospectus gives £2.4bn as the whole regional transport capital programme, not this extension. The June 2025 Spending Review claim was not checked against a primary source.
- **Curzon Street:** the sources read do not give an opening date or cost.
- **Missing status dates (11 schemes):** `sy-amp`, `em-freeport`, `em-ratcliffe`, `wy-bradford-dhez`, `wy-bus-franchising`, `yny-drax-ai`, `tv-freeport`, `ne-crown-works`, `bel-gii`, `bel-amic`, `bel-ireach`. Their sources are on sites I could not reach. `wm-gigapark` and `wm-gic` were filled.
- **`tv-nzt-power` place:** "Teesworks, Redcar" still does not geocode. I did not have a verified postcode for it.
- **`em-peak-resort`:** place set to "Unstone, Chesterfield (verify)". This is my understanding of where Peak Resort is; it still needs checking.
- **Photo dates:** years come from Wikimedia Commons metadata. Two asset photos have no recorded date.
- **Offshore Renewable Energy Catapult, Levenmouth:** the official page gives no full postcode, so it was not geocoded. It is in Fife, outside all ten regions.

## Assumptions

- **Status dates from the WMCA prospectus** use 21 October 2025, the file date of the PDF. The document itself says only "2025".
- **Status dates from the West Yorkshire pipeline** use 13 March 2026, the file date of the PDF.
- **New scheme coordinates** are Nominatim geocodes of a named place inside or beside the site. Each record says which place in `unknowns`. All are `area` precision except Paradise and Portersfield.
- **Stage for new records** is my reading of the source: "delivering" only where the source says work is on site or open; "approved" where funding or an agreement is confirmed; otherwise "pipeline".
- **`wm-bkq` parent:** `CLAUDE.md` suggested the Investment Zone as its parent; `IMPROVE.md` says the development corporation. The record has one parent field, so it follows `IMPROVE.md`.
- **Nearby Catapult sites** are the three named in the brief plus MTC Coventry. Other sites within 30km of a region (Edinburgh, Manchester, Bristol and others) are not shown.
- **"First innovation programme on record"** in the compare view is the first programme or fund in the register tagged "innovation". It is a pointer, not a judgement.

## Data conflicts still open

| Record | Conflict |
|---|---|
| `wm-sports-quarter` | Value: c.£2bn (Place Midlands); c.£4bn GDV and "£2.9 billion" (both in the WMCA prospectus); £3bn (WMCA development corporation page). Stadium capacity: 62,000 (club) or 60,000 (WMCA). |
| `wm-bkq` | Value: £4.2bn (prospectus) or £4bn (WMCA page). Site area: 130ha or c.210ha. |
| `wm-smithfield` | Value: £1.9bn (prospectus) or £2bn (WMCA page). |
| `wm-bemdc` | WMCA's own page still calls the corporation "proposed", after the Order came into force. |
| `gcr-investment-zone` | Value: £160m, £190m or £500m. The explanation that £500m includes retained rates and leveraged investment is my reading, not confirmed. |
| `wy-calderdale-garden-communities` | A641 scheme: £75m on one page of the pipeline and £68m on another. |
| National Wealth Fund wave 2 | The announcement names four new partners. Liverpool City Region is the fourth; it is not one of our ten regions. |
