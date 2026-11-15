# Improvement brief: round 2

Read this file and `CLAUDE.md` before starting. Work through the sections in order. Stop after each section, show me what changed, and list anything you assumed or couldn't verify.

The rules from `CLAUDE.md` still apply:
- every record needs a source;
- never invent figures, dates or locations;
- never overwrite coordinates without reporting it;
- British English and sentence case.

---

## 1. Fix the blank map on first load (critical)

**What's wrong:** on first load, at both 1366×768 and phone width, the map area is a blank grey. The console shows `Map cannot fit within canvas with the given bounds, padding, and/or offset.` The camera is never set, so the map sits on open sea. It only appears once a region is selected.

**Likely cause:** `bounds: all` is passed to the `Map` constructor before the container has its final size. On mobile, `bottomInset()` can also be larger than the canvas height.

**Fix:**
- After the `load` event, call `map.resize()`, then `fitBounds(all, …)`.
- Clamp the padding so the top plus bottom padding never exceeds 60% of the canvas height, and left plus right never exceeds 60% of its width.
- Refit on `ResizeObserver` and on orientation change. Only do this while no region or scheme is selected.
- Give the "All regions" link the same safe fit.

**Check:**
- Load at 1366×768, 1920×1080, 390×844 and 768×1024.
- All ten region outlines must be visible every time, with no console warning.
- Add a Playwright test that loads the page at each size and checks that the map's centre lies inside the UK bounding box.

## 2. Boundaries: confirm, don't change

All three boundaries were checked against official sources and are **correct**:

- **Belfast Region City Deal:** six councils (Antrim and Newtownabbey, Ards and North Down, Belfast, Lisburn and Castlereagh, Mid and East Antrim, Newry Mourne and Down). Source: BRCD memorandum of understanding, https://minutes.belfastcity.gov.uk/documents/s101181/Appendix 1 BRCD MoU Phase 3.pdf
- **Glasgow City Region:** eight councils. Source: https://glasgowcityregion.co.uk/who-we-are/partners/
- **South East Wales CJC:** ten councils. Source: SI 2021/343, https://www.legislation.gov.uk/wsi/2021/343/made

To do:
- Add each official source to `regions.json` as `boundary_source` and show it in the region panel ("Boundary: six councils of the Belfast Region City Deal. Source: …").
- People expect Belfast to mean the city. The region panel should make clear it covers the city deal area, from Ballymena to Newry.
- Add a toggle, "Show council boundaries", which is already built as a layer. It should be **on by default** when a region is selected, so people can see which councils make it up.

## 3. Catapult centres: replace the current list with the official one

**What's wrong:** only 10 Catapult sites are mapped, and some names are out of date. The official network map at https://catapult.org.uk/about-us/why-the-catapult-network/ lists 69 locations across nine Catapults. Its data is embedded in the page, so scrape it rather than re-keying it.

**Expected sites inside the ten regions (29).** Check each against the source page, geocode it from its address, and record the address:

| Region | Sites |
|---|---|
| West Midlands | Connected Places Catapult Birmingham; Energy Systems Catapult Birmingham; HVM Catapult "Birmingham" (identify which centre from the source); WMG Coventry; MTC Coventry (Ansty Park, just outside the boundary, so flag it as nearby) |
| South Yorkshire | AMRC Sheffield; AMRC Rotherham; Nuclear AMRC Rotherham; NMIS Sheffield (confirm this exists) |
| East Midlands | Nuclear AMRC Derby |
| West Yorkshire | Satellite Applications Catapult – Space Enterprise Lab Leeds |
| Tees Valley | CPI Wilton; CPI Darlington |
| North East | Digital Catapult Gateshead; CPI Newcastle; CPI Sedgefield (Neville Hamlin Building); CPI National Formulation Centre (Sedgefield); CPI Newton Aycliffe; Semiconductor Catapult Durham (Sedgefield); ORE Catapult Blyth |
| Glasgow City Region | ORE Catapult Glasgow; Semiconductor Catapult Glasgow (Strathclyde Technology and Innovation Centre); Space Enterprise Lab Glasgow; CPI Glasgow (Paisley); NMIS Scotland (Paisley); NMIS Advanced Forming Research Centre (Inchinnan) |
| Belfast Region | Digital Catapult Belfast |
| Cardiff Capital Region | Semiconductor Catapult Newport (Imperial Park, NP10 8BE); Space Enterprise Lab Newport |

**Nearby, outside the boundary:** NMIS Digital Process Manufacturing Centre (Irvine), HVM Catapult Baglan, and Satellite Applications Catapult Leicester. Include them only with `nearby: true` and a "just outside" label.

Rules:
- Rename "Compound Semiconductor Applications Catapult" to **Semiconductor Catapult** (its current name; source https://sc.catapult.org.uk/who-we-are/locations/).
- Model the network properly: give each site a `catapult` field (one of the nine Catapults) and a `centre` field (such as "CPI" or "AMRC"). Each HVM site gets `catapult: "High Value Manufacturing"`.
- **Connected Places Catapult Birmingham** gets a distinct "CPC" marker style. That's us.
- Add a filter by Catapult, and a "Catapult network" layer toggle.
- Show the count per region in the region panel.

**Optional extra layer:** the DSIT Innovation Clusters Map publishes cluster data under the Open Government Licence (https://www.gov.uk/government/publications/innovation-clusters-map-data). Add it as an off-by-default "Innovation clusters" layer showing points or areas inside the ten regions only, with a sector filter. Download it in a script and commit the processed file.

## 4. National Wealth Fund layer

The NWF doesn't publish a list of schemes. Model it at two levels.

**Region level.** Add `nwf_partnership` to `regions.json`:

- **Wave 1 (October 2025):** Glasgow City Region, West Midlands, West Yorkshire.
- **Wave 2 (agreed 7 September 2026):** South Yorkshire, North East, Cardiff Capital Region.
- **None:** East Midlands, York and North Yorkshire, Tees Valley, Belfast.
- Source: https://www.nationalwealthfund.org.uk/news-and-publications/news/national-wealth-fund-expands-regional-partnerships-programme/
- Show this as a badge in the region list and panel, and as a column in the compare view.

**Scheme level.** Add `nwf_support: { type, source }` for the projects the NWF has named publicly:

- Clyde Metro (`gcr-clyde-metro`);
- Greenpower Park, which is our `wm-gigapark` (add the alias "Greenpower Park");
- West Yorkshire Mass Transit (`wy-mass-transit`);
- the Sports Quarter (`wm-sports-quarter`).

Sources:
- https://www.nationalwealthfund.org.uk/news/national-wealth-fund-launches-new-regional-project-accelerator-local-government
- the September 2026 announcement above.

Add an "NWF-supported" filter.

**Where to catalogue the major schemes.** Use each region's investment prospectus or pipeline, not the NWF. Extract the named schemes from these and add them as records:

- **West Midlands:** Investment Prospectus 2025 (four growth corridors: Birmingham and North Solihull Gateway, Coventry Growth Arc, Black Country Growth Corridor, Wolverhampton–Walsall Growth Cluster). https://cloudcdn.wmca.org.uk/documents/wmca/pdf/wmca-investment-prospectus_digital-reduced.pdf
- **West Yorkshire:** Infrastructure pipeline, March 2026 (six nationally significant projects). https://www.westyorks-ca.gov.uk/media/2w2c5u0i/infrastructure-pipeline-march-2026.pdf. Also the investment prospectus from May 2026.
- **Other regions:** find the equivalent prospectus or pipeline document from their UKREiiF 2026 delegations, and list any you couldn't find.

Add a `corridor` field where a prospectus groups schemes into corridors or zones, and show it in the scheme card.

## 5. Birmingham and the West Midlands: fill the gaps

Add these as records. Verify each against its source, and use the WMCA or Birmingham City Council primary source where one exists.

| ID (suggested) | Scheme | Key facts to verify | Starting source |
|---|---|---|---|
| `wm-smithfield` | Smithfield, Birmingham | £1.9bn; next to the Bullring; first phase under way 2026 | Express and Star 20 Oct 2025; Place Midlands "what we're watching in 2026" |
| `wm-curzon-street` | HS2 Curzon Street station and surroundings | Station under construction; anchors the Eastside growth corridor | WMCA green paper, key development sites |
| `wm-central-heart` | Birmingham Central Heart | Up to 5,000 homes, 8,000 jobs, 400,000 sq m commercial; launched at MIPIM in March 2026; sites include Martineau Galleries and City Arcade | https://www.investwestmidlands.com/news/2026/03/10/birmingham-central-heart-investment-opportunity/ |
| `wm-digbeth` | Digbeth creative quarter | BBC Tea Factory, Digbeth Loc studios, Beorma Quarter | Express and Star; Greater Birmingham Chambers |
| `wm-arden-cross` | Arden Cross, Solihull (HS2 Interchange) | Billed as £3.2bn; Muse with the University of Warwick | Place Midlands "ones to watch" |
| `wm-metro-sports-quarter` | Metro extension to the Sports Quarter | £2.4bn transport allocation (June 2025 Spending Review) to extend Metro to the Sports Quarter | ACE, 4 June 2025 |
| `wm-futures-fund` | West Midlands Futures Fund | £3.8bn: £800m WMCA, £1.1bn West Midlands Pension Fund, £1.7bn Homes England; launched at UKREiiF on 19 May 2026; NWF is a partner | https://www.investwestmidlands.com/news/2026/05/19/mayor-launches-3-8bn-futures-fund-war-chest-to-supercharge-west-midlands-economy/ |
| `wm-lipf` | West Midlands Local Innovation Partnerships Fund | £50m | Place Midlands, UKREiiF 2026 preview |
| `wm-paradise`, `wm-ladywood` | Paradise; Ladywood estate regeneration | Check the current phase and scale | WMCA prospectus residential pipeline |

**Corrections to existing records:**
- `wm-sports-quarter`: we have £2bn, but WMCA's prospectus says £4bn. Record both in `value_note` with their sources, and set `value_gbp_m` to null until it's resolved.
- `wm-bkq`: the prospectus calls it the "£4bn Birmingham Knowledge Quarter". Add the figure with its source. The site area is also inconsistent (130ha and 210ha in different documents). Keep that in `unknowns`.
- `wm-bemdc`: some sources say "launched May 2026" and others "expected to be formally established by 2027". Check the Order (SI 2026/405) and settle it.
- Set `parent: "wm-bemdc"` on the Sports Quarter, Knowledge Quarter, Curzon Street, Smithfield, Digbeth and Central Heart, which are the areas the corporation oversees. Check this list against the WMCA source.

## 6. Other data corrections

- **Glasgow Investment Zone value:** sources give £160m, £190m and "£500 million Investment Zone" (on GCR's own partners page). Record all three with their sources and explain the difference: £500m probably includes leveraged or retained rates. Set `value_gbp_m` to null until it's resolved.
- **Location report:**
  - `em-ratcliffe` is correct: the coordinates are the power station. The `place` field ("Rushcliffe") caused the false flag, so change it to "Ratcliffe-on-Soar Power Station, Nottinghamshire".
  - For the 12 places that couldn't be geocoded, give each a precise, geocodable place string or a postcode. Re-run the check.
- **Three Belfast schemes on one point** (`bel-pbgf`, `bel-funding-clarity`, `bel-city-centre`): the first two are city-wide. Set them to `loc_precision: "region"` so they appear in the region panel, not on the map. Leave `bel-city-centre` as the only city centre marker.
- **Images:**
  - Remove any image that doesn't show the scheme itself. Wrong: `bel-gii` shows Titanic Belfast; `ne-gateshead-quays` shows the Sage; `em-step-fusion` shows a country lane.
  - Remove images more than ten years old where the site has changed beyond recognition (`sy-airport-city` 2006, `tv-teesworks` 2009).
  - Better no picture than a misleading one.
  - Every image that stays needs a caption saying what it shows, its date, and its licence.
- **Missing status dates** ("Not recorded"): fill from the source where possible. Otherwise show "Date not known", not a blank.

## 7. Finish phase 3

Phase 3 from `CLAUDE.md` was not delivered. Complete it:
- **CSV export** of the current filtered list (schemes and assets).
- **Compare regions view**, adding the NWF partnership, Catapult count and Investment Zone value columns.
- **"Copy summary"** button on each scheme card.
- **Password screen**, set by an environment variable at build time. It's a deterrent only, and the README must say so.
- **Change history:** add `history: []` and `last_checked` to every record, with a "What's moved" view (falls back to `status_date`).

## 8. Smaller fixes

- **Load data at runtime.** Move it out of the JS bundle (currently 1.25MB uncompressed) into `public/data/*.json`, fetched when the page loads. Data updates then don't change the app code, and the bundle shrinks.
- **Mobile:** the bottom sheet starts at about half the screen and hides the map. Start it at about 25% height, with a drag handle and a "Show list" button.
- **Search:** make sure it covers aliases. For example "Greenpower Park", "DSA" and "MDC" must each find their scheme.
- **Accessibility:** run axe-core on the main views and fix any serious issues.

## Final checks before you stop

- [ ] All ten regions visible on first load at four screen sizes, with no console warnings.
- [ ] `npm run validate` passes, and every new record has a source.
- [ ] Catapult layer shows 29 sites inside the regions, each traceable to catapult.org.uk.
- [ ] NWF badges appear on six regions and four schemes.
- [ ] At least eight new West Midlands records, each with a primary or official source.
- [ ] `reports/locations.md` regenerated with fewer "could not geocode" entries.
- [ ] Write `reports/round-2.md`: what changed, what you couldn't verify, and any data conflicts still open.
