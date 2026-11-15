import { assets, assetsIn, childrenOf, isMapped, otherRegions, regionById, regions, schemeById, schemeOnlyFilters, schemes, schemesIn, type Filters } from './data';
import {
  CONFIDENCE_HELP,
  KIND_LABELS,
  KIND_LETTER,
  KIND_PLURALS,
  NO_DATE,
  REGION_COLOURS,
  STAGE_LABELS,
  TYPE_LABELS,
  capitalise,
  esc,
  formatDate,
  formatValue,
  isCpc,
  shortValue,
} from './labels';
import { ASSET_KINDS, CATAPULTS, CONFIDENCES, DOCUMENT_KINDS, OTHER_GROUPS, SCHEME_TYPES, STAGES, THEMES, type Asset, type OtherRegion, type Region, type Scheme } from './schema';

type ImageInfo = NonNullable<Scheme['image']>;

const stageChip = (s: Scheme) => `<span class="chip chip-stage chip-${s.stage}">${STAGE_LABELS[s.stage]}</span>`;
const nwfChip = (text = 'NWF-supported') => `<span class="chip chip-nwf">${text}</span>`;
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const external = (url: string, text: string) =>
  `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text)}<span class="visually-hidden"> (opens in new tab)</span></a>`;
const badge = (a: Asset) =>
  isCpc(a)
    ? '<span class="asset-badge asset-cpc" aria-hidden="true">CPC</span>'
    : `<span class="asset-badge asset-${a.kind}" aria-hidden="true">${KIND_LETTER[a.kind]}</span>`;
const kindLabel = (a: Asset) => (a.catapult ? `${a.catapult} Catapult` : KIND_LABELS[a.kind]);

function schemeRow(s: Scheme, showRegion: boolean): string {
  const meta = [showRegion ? regionById.get(s.region)?.name : s.place, shortValue(s), formatDate(s.status_date) || NO_DATE].filter(Boolean);
  return `<li><button type="button" class="row" data-scheme="${s.id}">
    <span class="row-name">${esc(s.name)}</span>
    <span class="row-meta">${stageChip(s)} ${s.nwf_support ? nwfChip() + ' ' : ''}${meta.map(esc).join(' · ')}</span>
  </button></li>`;
}

function assetRow(a: Asset, showRegion: boolean): string {
  const meta = [kindLabel(a), a.nearby ? 'Just outside the boundary' : '', showRegion ? regionById.get(a.region)?.name : ''].filter(Boolean);
  return `<li><button type="button" class="row" data-asset="${a.id}">
    <span class="row-name">${badge(a)}${esc(a.name)}</span>
    <span class="row-meta">${meta.map(esc).join(' · ')}</span>
  </button></li>`;
}

const list = (rows: string[]) => `<ul class="rows">${rows.join('')}</ul>`;

function figure(image: ImageInfo | null | undefined): string {
  if (!image) return '';
  return `<figure class="card-image">
    <img src="${esc(image.url)}" alt="" loading="lazy" onerror="this.closest('figure').remove()" />
    <figcaption>${esc(image.caption)}, ${image.date ? `photographed in ${esc(image.date)}` : 'date not recorded'}. Photo: ${external(image.source_url, image.credit)}, ${esc(image.licence)}.</figcaption>
  </figure>`;
}

const sources = (items: { title: string; url: string }[]) =>
  `<h3>Sources</h3><ul class="links">${items.map((s) => `<li>${external(s.url, s.title)}</li>`).join('')}</ul>`;

function timeline(history: Scheme['history']): string {
  if (!history.length) return '';
  const rows = [...history].sort((a, b) => b.date.localeCompare(a.date));
  return `<h3>History</h3><ol class="timeline">${rows
    .map((h) => `<li><span class="timeline-date">${formatDate(h.date)}</span> ${esc(h.change)} ${external(h.source, 'Source')}</li>`)
    .join('')}</ol>`;
}

// ---------- Regions (default view) ----------

export function renderOverview(): string {
  const mapped = schemes.filter(isMapped).length;
  const rows = regions.map((r) => {
    const inRegion = schemesIn(r.id);
    const sites = inRegion.filter(isMapped).length;
    const atRisk = inRegion.filter((s) => s.stage === 'at_risk').length;
    const counts = [plural(sites, 'site'), `${inRegion.length - sites} region-wide`, plural(assetsIn(r.id).length, 'asset')];
    const chips = [atRisk ? `<span class="chip chip-stage chip-at_risk">${atRisk} at risk</span>` : '', r.nwf_partnership ? nwfChip('NWF partner') : ''].filter(Boolean);
    return `<li><button type="button" class="row row-region" data-region="${r.id}" style="--region:${REGION_COLOURS[r.id]}">
      <span class="row-name">${esc(r.name)}</span>
      <span class="row-meta">${esc(r.nation)} · ${counts.join(' · ')}${chips.length ? ' · ' + chips.join(' ') : ''}</span>
    </button></li>`;
  });
  return `<h2 tabindex="-1">Priority regions</h2>
    <p class="lede">Choose a region on the map or in this list to see its investment sites, region-wide programmes and innovation assets.</p>
    <p class="hint">${schemes.length} schemes (${mapped} on the map, ${schemes.length - mapped} region-wide) and ${assets.length} universities, Catapult sites and research centres.</p>
    ${list(rows)}
    <h2 class="section">Other regions</h2>
    <p class="hint">Shown in grey. Not priority regions, so they carry no scheme records. Choose one to zoom to it.</p>
    ${OTHER_GROUPS.map((group) => {
      const items = otherRegions.filter((o) => o.group === group);
      return `<h3>${GROUP_HEADINGS[group]} (${items.length})</h3>${list(items.map(otherRow))}`;
    }).join('')}`;
}

const GROUP_HEADINGS: Record<(typeof OTHER_GROUPS)[number], string> = {
  established: 'Established authorities in England',
  emerging: 'Emerging and proposed authorities in England',
  devolved: 'Deal areas and joint committees in Scotland, Wales and Northern Ireland',
};

function otherRow(o: OtherRegion): string {
  return `<li><button type="button" class="row row-other" data-region="${o.id}">
    <span class="row-name">${esc(o.name)}</span>
    <span class="row-meta">${esc(o.type)} · ${esc(o.nation)} · ${plural(o.lads.length, 'council')}</span>
  </button></li>`;
}

export function renderOther(o: OtherRegion): string {
  return `<p><button type="button" class="link back" data-action="home">All regions</button></p>
    <h2 tabindex="-1" class="region-heading" style="--region:#505a5f">${esc(o.name)}</h2>
    <p class="lede">${esc(o.type)}</p>
    <p class="hint">${esc(o.nation)} · ${plural(o.lads.length, 'council')}</p>
    <p class="chips"><span class="chip">Not a priority region</span></p>
    <h3>Status</h3>
    <p>${esc(o.status_note)}</p>
    ${o.unknowns ? `<div class="unknowns"><h3>What we don’t know</h3><p>${esc(o.unknowns)}</p></div>` : ''}
    <h3>Councils (${o.lads.length})</h3>
    <p>${o.lads.map(esc).join(', ')}.</p>
    ${sources(o.sources)}
    <p class="confidence" title="${esc(CONFIDENCE_HELP[o.confidence])}"><span class="chip chip-confidence-${o.confidence}">${capitalise(o.confidence)} confidence</span> ${esc(CONFIDENCE_HELP[o.confidence].split(': ')[1])}</p>
    <p class="hint">No schemes or assets are recorded for this region. The boundary is built from ONS council boundaries (December 2025).</p>`;
}

// ---------- Schemes list with filters ----------

function checks(legend: string, name: string, options: readonly (readonly [string, string])[], chosen: string[]): string {
  return `<fieldset><legend>${legend}</legend>${options
    .map(([value, label]) => `<label><input type="checkbox" data-filter="${name}" value="${esc(value)}"${chosen.includes(value) ? ' checked' : ''} /> ${esc(label)}</label>`)
    .join('')}</fieldset>`;
}

export const activeFilterCount = (f: Filters) =>
  f.regions.length + f.themes.length + f.types.length + f.stages.length + f.confidence.length + f.catapults.length + Number(f.unknowns) + Number(f.nwf);

export function renderList(f: Filters, found: { schemes: Scheme[]; assets: Asset[] }, filtersOpen: boolean, others: OtherRegion[] = []): string {
  const active = activeFilterCount(f);
  const total = found.schemes.length + found.assets.length + others.length;
  const note = f.catapults.length
    ? 'Schemes are hidden while a Catapult filter is on.'
    : schemeOnlyFilters(f)
      ? 'Assets are hidden while a scheme filter (theme, type, stage, confidence, unknowns or NWF) is on.'
      : '';
  return `<h2 tabindex="-1">Schemes and assets</h2>
    <details class="filters" id="filters"${filtersOpen ? ' open' : ''}>
      <summary>Filters${active ? ` (${active} on)` : ''}</summary>
      ${checks('Region', 'regions', regions.map((r) => [r.id, r.name] as const), f.regions)}
      ${checks('Theme', 'themes', THEMES.map((t) => [t, capitalise(t)] as const), f.themes)}
      ${checks('Type', 'types', SCHEME_TYPES.map((t) => [t, TYPE_LABELS[t]] as const), f.types)}
      ${checks('Stage', 'stages', STAGES.map((t) => [t, STAGE_LABELS[t]] as const), f.stages)}
      ${checks('Confidence', 'confidence', CONFIDENCES.map((t) => [t, capitalise(t)] as const), f.confidence)}
      <fieldset><legend>Other</legend>
        <label><input type="checkbox" data-filter="unknowns"${f.unknowns ? ' checked' : ''} /> Has unknowns</label>
        <label><input type="checkbox" data-filter="nwf"${f.nwf ? ' checked' : ''} /> NWF-supported</label>
      </fieldset>
      ${checks('Catapult (assets only)', 'catapults', CATAPULTS.map((c) => [c, c] as const), f.catapults)}
    </details>
    <p class="result-bar"><strong id="result-count">${plural(total, 'result')}</strong>${f.q ? ` for “${esc(f.q)}”` : ''}
      <button type="button" class="link" data-action="csv">Download CSV</button>
      ${active || f.q ? '<button type="button" class="link" data-action="clear-filters">Clear filters and search</button>' : ''}</p>
    ${note ? `<p class="hint">${note}</p>` : ''}
    ${found.schemes.length ? `<h3>Schemes (${found.schemes.length})</h3>${list(found.schemes.map((s) => schemeRow(s, true)))}` : ''}
    ${found.assets.length ? `<h3>Innovation and R&amp;D assets (${found.assets.length})</h3>${list(found.assets.map((a) => assetRow(a, true)))}` : ''}
    ${others.length ? `<h3>Other regions (${others.length})</h3>${list(others.map(otherRow))}` : ''}
    ${total ? '' : '<p>Nothing matches. Search covers names, other names, places and status text.</p>'}`;
}

/** CSV of exactly the rows in the list. */
export function toCsv(found: { schemes: Scheme[]; assets: Asset[] }): string {
  const cell = (v: unknown) => {
    const text = v == null ? '' : String(v);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const head = ['record', 'id', 'name', 'region', 'type', 'stage', 'themes', 'value_gbp_m', 'value_note', 'status', 'status_date', 'unknowns', 'place', 'lat', 'lng', 'location_precision', 'corridor', 'nwf_support', 'catapult', 'confidence', 'last_checked', 'sources'];
  const rows = [
    ...found.schemes.map((s) => ['scheme', s.id, s.name, regionById.get(s.region)?.name, TYPE_LABELS[s.type], STAGE_LABELS[s.stage], s.themes.join('; '), s.value_gbp_m, s.value_note, s.status, s.status_date, s.unknowns, s.place, s.lat, s.lng, s.loc_precision, s.corridor, s.nwf_support?.type, '', s.confidence, s.last_checked, s.sources.map((x) => x.url).join(' ')]),
    ...found.assets.map((a) => ['asset', a.id, a.name, regionById.get(a.region)?.name, KIND_LABELS[a.kind], '', '', '', '', a.summary, '', '', a.address ?? '', a.lat, a.lng, a.loc_precision, '', '', a.catapult ?? '', a.confidence, a.last_checked, a.sources.map((x) => x.url).join(' ')]),
  ];
  return [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

// ---------- Region panel ----------

const DOCUMENT_HEADINGS: Record<(typeof DOCUMENT_KINDS)[number], string> = {
  growth_plan: 'Growth plans and economic strategies',
  prospectus: 'Investment prospectuses and pipelines',
  transport_plan: 'Transport plans',
};

export function renderRegion(r: Region): string {
  const inRegion = schemesIn(r.id);
  const sites = inRegion.filter(isMapped);
  const wide = inRegion.filter((s) => !isMapped(s));
  const regionAssets = assetsIn(r.id);
  const catapults = regionAssets.filter((a) => a.kind === 'catapult');
  const inside = catapults.filter((a) => !a.nearby).length;
  const stageCounts = STAGES.map((stage) => [stage, inRegion.filter((s) => s.stage === stage).length] as const).filter(([, n]) => n);
  const themeCounts = new Map<string, number>();
  for (const s of inRegion) for (const t of s.themes) themeCounts.set(t, (themeCounts.get(t) ?? 0) + 1);
  const topThemes = [...themeCounts].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const nwf = r.nwf_partnership;
  const heading = (kind: (typeof ASSET_KINDS)[number], n: number) =>
    kind === 'catapult' ? `Catapult sites (${inside} in the region${n > inside ? `, ${n - inside} just outside` : ''})` : `${KIND_PLURALS[kind]} (${n})`;

  return `<p><button type="button" class="link back" data-action="home">All regions</button></p>
    <h2 tabindex="-1" class="region-heading" style="--region:${REGION_COLOURS[r.id]}">${esc(r.name)}</h2>
    <p class="lede">${esc(r.body)}</p>
    <p class="hint">${esc(r.type)} · ${esc(r.nation)} · ${plural(r.lads.length, 'council')}</p>
    <p class="chips">${nwf ? nwfChip(`National Wealth Fund partner (wave ${nwf.wave})`) : '<span class="chip">No National Wealth Fund partnership</span>'}</p>
    ${nwf ? `<p class="hint">Strategic partnership ${nwf.wave === 1 ? 'launched' : 'agreed'} ${formatDate(nwf.agreed)}. ${external(nwf.source.url, 'Source')}</p>` : ''}
    <div class="inset">
      <h3>Boundary</h3>
      <p>${esc(r.boundary_note)}</p>
      <p class="hint">${r.lads.map(esc).join(', ')}. Source: ${external(r.boundary_source.url, r.boundary_source.title)}</p>
    </div>
    ${r.watch_notes ? `<div class="inset"><h3>What to watch</h3><p>${esc(r.watch_notes)}</p></div>` : ''}
    <h3>Schemes by stage</h3>
    <p class="chips">${stageCounts.map(([stage, n]) => `<span class="chip chip-stage chip-${stage}">${STAGE_LABELS[stage]} ${n}</span>`).join(' ')}</p>
    <p class="hint">Main themes: ${topThemes.map(([t, n]) => `${t} (${n})`).join(', ')}.</p>
    <h3>Investment sites and places (${sites.length})</h3>
    <p class="hint">Shown on the map. Locations are approximate.</p>
    ${list(sites.map((s) => schemeRow(s, false)))}
    <h3>Region-wide (${wide.length})</h3>
    <p class="hint">Funds, programmes and powers that cover the whole region. Not shown on the map.</p>
    ${list(wide.map((s) => schemeRow({ ...s, place: '' }, false)))}
    <h3>Innovation and R&amp;D assets (${regionAssets.length})</h3>
    ${ASSET_KINDS.map((kind) => {
      const items = regionAssets.filter((a) => a.kind === kind);
      return items.length ? `<h4>${heading(kind, items.length)}</h4>${list(items.map((a) => assetRow(a, false)))}` : '';
    }).join('')}
    <h3>Plans and prospectuses</h3>
    ${DOCUMENT_KINDS.map((kind) => {
      const items = r.documents.filter((x) => x.kind === kind);
      return `<h4>${DOCUMENT_HEADINGS[kind]}</h4>${
        items.length
          ? `<ul class="links">${items.map((x) => `<li>${external(x.url, x.title)}<br /><span class="hint">${esc(x.dated)}${x.note ? `. ${esc(x.note)}` : ''}</span></li>`).join('')}</ul>`
          : '<p class="hint">None found.</p>'
      }`;
    }).join('')}
    ${r.documents_gaps ? `<p class="hint"><strong>Gaps:</strong> ${esc(r.documents_gaps)}</p>` : ''}
    <h3>Governance papers</h3>
    <ul class="links">${r.governance_sources.map((g) => `<li>${external(g.url, g.label)}</li>`).join('')}</ul>
    <p><button type="button" class="button button-secondary" data-action="print">Print region brief</button></p>`;
}

// ---------- Scheme and asset cards ----------

const fact = (label: string, value: string) => (value ? `<div><dt>${label}</dt><dd>${value}</dd></div>` : '');
const schemeLink = (s: Scheme) => `<button type="button" class="link" data-scheme="${s.id}">${esc(s.name)}</button>`;

export function schemeSummary(s: Scheme): string {
  const region = regionById.get(s.region)?.name ?? '';
  const line2 = [STAGE_LABELS[s.stage], formatValue(s.value_gbp_m), s.status_date ? `as of ${formatDate(s.status_date)}` : ''].filter(Boolean).join(', ');
  return `${s.name} (${region})\n${line2}\n${s.status} Source: ${s.sources[0].url}`;
}

export function renderScheme(s: Scheme, backLabel: string): string {
  const region = regionById.get(s.region)!;
  const precision =
    s.loc_precision === 'site' ? 'Approximate site location' : s.loc_precision === 'area' ? 'Covers an area. Marker is indicative.' : 'Region-wide. Not shown on the map.';
  const value = [s.value_gbp_m != null ? `<strong>${formatValue(s.value_gbp_m)}</strong>` : '', esc(s.value_note)].filter(Boolean).join('<br />');
  const parent = s.parent ? schemeById.get(s.parent) : undefined;
  const children = childrenOf(s.id);
  return `<p><button type="button" class="link back" data-action="back">${esc(backLabel)}</button></p>
    ${figure(s.image)}
    <h2 tabindex="-1">${esc(s.name)}</h2>
    ${s.aliases.length ? `<p class="hint">Also called: ${s.aliases.map(esc).join(', ')}</p>` : ''}
    <p class="chips"><span class="chip">${TYPE_LABELS[s.type]}</span> ${stageChip(s)} ${s.nwf_support ? nwfChip() : ''}</p>
    <dl class="facts">
      ${fact('Region', `<button type="button" class="link" data-region="${region.id}">${esc(region.name)}</button>`)}
      ${fact('Place', s.place ? `${esc(s.place)}<br /><span class="hint">${precision}</span>` : '')}
      ${fact('Corridor', esc(s.corridor))}
      ${fact('Part of', parent ? schemeLink(parent) : '')}
      ${fact('Includes', children.map(schemeLink).join('<br />'))}
      ${fact('Value', value)}
      ${fact('Funding', esc(s.funding))}
      ${fact('Status date', esc(formatDate(s.status_date)) || `<span class="hint">${NO_DATE}</span>`)}
    </dl>
    <h3>Latest position</h3>
    <p>${esc(s.status)}</p>
    ${s.nwf_support ? `<div class="inset inset-nwf"><h3>National Wealth Fund</h3><p>${esc(s.nwf_support.type)}. ${external(s.nwf_support.source.url, 'Source')}</p></div>` : ''}
    <div class="unknowns">
      <h3>What we don’t know</h3>
      <p>${s.unknowns ? esc(s.unknowns) : 'Nothing recorded yet.'}</p>
    </div>
    <h3>Themes</h3>
    <p class="chips">${s.themes.map((t) => `<span class="chip chip-theme">${capitalise(t)}</span>`).join(' ')}</p>
    ${timeline(s.history)}
    ${sources(s.sources)}
    <p class="confidence" title="${esc(CONFIDENCE_HELP[s.confidence])}"><span class="chip chip-confidence-${s.confidence}">${capitalise(s.confidence)} confidence</span> ${esc(CONFIDENCE_HELP[s.confidence].split(': ')[1])} Last checked ${formatDate(s.last_checked)}.</p>
    <p><button type="button" class="button" data-action="copy" data-id="${s.id}">Copy summary</button> <span class="hint" id="copy-status" role="status"></span></p>`;
}

export function renderAsset(a: Asset, backLabel: string): string {
  const region = regionById.get(a.region)!;
  const isCatapult = a.kind === 'catapult';
  return `<p><button type="button" class="link back" data-action="back">${esc(backLabel)}</button></p>
    ${figure(a.image)}
    <h2 tabindex="-1">${esc(a.name)}</h2>
    <p class="chips"><span class="chip">${badge(a)}${esc(kindLabel(a))}</span>${a.nearby ? ' <span class="chip chip-nearby">Just outside the boundary</span>' : ''}</p>
    ${a.summary ? `<p>${esc(a.summary)}</p>` : ''}
    <dl class="facts">
      ${fact('Region', `<button type="button" class="link" data-region="${region.id}">${esc(region.name)}</button>${a.nearby ? `<br /><span class="hint">${esc(a.nearby_note)}</span>` : ''}`)}
      ${fact('Catapult', a.catapult ? `${esc(a.catapult)} Catapult` : '')}
      ${fact('Centre', esc(a.centre))}
      ${fact('Address', esc(a.address))}
      ${fact('Established', a.established ? String(a.established) : '')}
      ${fact('Students', a.students ? a.students.toLocaleString('en-GB') : '')}
      ${fact('Website', a.website ? external(a.website, a.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')) : '')}
      ${fact('Location', `${a.loc_precision === 'area' ? 'Indicative' : 'From'} ${esc(a.loc_source)}`)}
    </dl>
    ${timeline(a.history)}
    ${sources(a.sources)}
    <p class="hint">${
      isCatapult
        ? 'Name, address and description come from the Catapult Network’s own map of locations.'
        : 'Facts come from Wikidata and OpenStreetMap, not from board papers. Check before quoting.'
    } Last checked ${formatDate(a.last_checked)}.</p>`;
}

// ---------- Compare regions ----------

export function renderCompare(): string {
  const yes = (label: string) => `<strong>Yes</strong><br /><span class="hint">${esc(label)}</span>`;
  const rows = regions.map((r) => {
    const all = schemesIn(r.id);
    const zone = all.find((s) => /investment zone/i.test(s.name) && s.id.endsWith('investment-zone'));
    const freeport = all.find((s) => /freeport/i.test(s.name));
    const mdc = all.filter((s) => /mayoral development (corporation|zone)/i.test(s.name));
    const innovation = all.find((s) => s.themes.includes('innovation') && (s.type === 'programme' || s.type === 'fund'));
    const sitesIn = assetsIn(r.id).filter((a) => a.kind === 'catapult' && !a.nearby).length;
    const zoneValue = zone ? (zone.value_gbp_m != null ? formatValue(zone.value_gbp_m) : 'Value unresolved') : '';
    return `<tr>
      <th scope="row"><button type="button" class="link" data-region="${r.id}">${esc(r.name)}</button></th>
      <td class="num">${all.length}</td>
      <td class="num">${all.filter((s) => s.stage === 'at_risk').length}</td>
      <td>${zone ? yes(zoneValue) : 'No'}</td>
      <td>${freeport ? yes(freeport.name) : 'No'}</td>
      <td>${mdc.length ? yes(mdc.map((s) => s.name).join('; ')) : 'No'}</td>
      <td>${r.nwf_partnership ? `<strong>Wave ${r.nwf_partnership.wave}</strong><br /><span class="hint">${formatDate(r.nwf_partnership.agreed)}</span>` : 'None'}</td>
      <td class="num">${sitesIn}</td>
      <td>${innovation ? `<button type="button" class="link" data-scheme="${innovation.id}">${esc(innovation.name)}</button>` : '<span class="hint">None recorded</span>'}</td>
      <td>${esc(r.watch_notes)}</td>
    </tr>`;
  });
  return `<h2 tabindex="-1">Compare regions</h2>
    <p class="hint">Counts come from the scheme register. Investment Zone values are headline figures and overlap with the sites inside each zone, so they must not be added up. “Value unresolved” means sources disagree.</p>
    <div class="table-wrap" tabindex="0" role="region" aria-label="Comparison table"><table class="compare">
      <thead><tr><th scope="col">Region</th><th scope="col">Schemes</th><th scope="col">At risk</th><th scope="col">Investment Zone</th><th scope="col">Freeport</th>
      <th scope="col">Mayoral development corporation or zone</th><th scope="col">National Wealth Fund partnership</th><th scope="col">Catapult sites</th><th scope="col">First innovation programme on record</th><th scope="col">Watch notes</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table></div>`;
}

// ---------- What's moved ----------

export interface Movement {
  date: string;
  change: string;
  source: string;
  id: string;
  name: string;
  region: string;
  kind: 'scheme' | 'asset';
}

export function movements(): Movement[] {
  const out: Movement[] = [];
  for (const s of schemes) {
    for (const h of s.history) out.push({ ...h, id: s.id, name: s.name, region: s.region, kind: 'scheme' });
    // The latest known position, from before the change log existed.
    if (s.status_date) out.push({ date: s.status_date, change: s.status, source: s.sources[0].url, id: s.id, name: s.name, region: s.region, kind: 'scheme' });
  }
  for (const a of assets) for (const h of a.history) out.push({ ...h, id: a.id, name: a.name, region: a.region, kind: 'asset' });
  return out.sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
}

export function renderMoved(region: string): string {
  const all = movements().filter((m) => !region || m.region === region);
  const shown = all.slice(0, 150);
  return `<h2 tabindex="-1">What’s moved</h2>
    <p class="hint">Changes to records and each scheme’s latest dated position, newest first.</p>
    <p><label for="moved-region">Region</label>
      <select id="moved-region"><option value="">All regions</option>${regions.map((r) => `<option value="${r.id}"${r.id === region ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select></p>
    <ol class="moved">${shown
      .map(
        (m) => `<li><span class="timeline-date">${formatDate(m.date)}</span>
        <button type="button" class="link" data-${m.kind}="${m.id}">${esc(m.name)}</button> <span class="hint">${esc(regionById.get(m.region)?.name)}</span>
        <p>${esc(m.change)} ${external(m.source, 'Source')}</p></li>`,
      )
      .join('')}</ol>
    ${all.length > shown.length ? `<p class="hint">Showing the latest ${shown.length} of ${all.length}. Choose a region to narrow the list.</p>` : ''}`;
}
