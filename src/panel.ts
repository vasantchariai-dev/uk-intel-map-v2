import { assetsIn, isMapped, regionById, regions, schemes, schemesIn, assets as allAssets } from './data';
import {
  CONFIDENCE_HELP,
  KIND_LABELS,
  KIND_LETTER,
  KIND_PLURALS,
  REGION_COLOURS,
  STAGE_LABELS,
  TYPE_LABELS,
  capitalise,
  esc,
  formatDate,
  formatValue,
  shortValue,
} from './labels';
import { ASSET_KINDS, STAGES, type Asset, type Region, type Scheme } from './schema';

type ImageInfo = NonNullable<Scheme['image']>;

const stageChip = (s: Scheme) => `<span class="chip chip-stage chip-${s.stage}">${STAGE_LABELS[s.stage]}</span>`;
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const external = (url: string, text: string) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text)}<span class="visually-hidden"> (opens in new tab)</span></a>`;

function schemeRow(s: Scheme, showRegion: boolean): string {
  const meta = [showRegion ? regionById.get(s.region)?.name : s.place, shortValue(s), formatDate(s.status_date)].filter(Boolean);
  return `<li><button type="button" class="row" data-scheme="${s.id}">
    <span class="row-name">${esc(s.name)}</span>
    <span class="row-meta">${stageChip(s)} ${meta.map(esc).join(' · ')}</span>
  </button></li>`;
}

function assetRow(a: Asset, showRegion: boolean): string {
  const meta = [KIND_LABELS[a.kind], showRegion ? regionById.get(a.region)?.name : ''].filter(Boolean);
  return `<li><button type="button" class="row" data-asset="${a.id}">
    <span class="row-name"><span class="asset-badge asset-${a.kind}" aria-hidden="true">${KIND_LETTER[a.kind]}</span>${esc(a.name)}</span>
    <span class="row-meta">${meta.map(esc).join(' · ')}</span>
  </button></li>`;
}

const list = (rows: string[]) => `<ul class="rows">${rows.join('')}</ul>`;

function figure(image: ImageInfo | null | undefined): string {
  if (!image) return '';
  return `<figure class="card-image">
    <img src="${esc(image.url)}" alt="" loading="lazy" onerror="this.closest('figure').remove()" />
    <figcaption>${esc(image.caption)}. Photo: ${external(image.source_url, image.credit)}, ${esc(image.licence)}.</figcaption>
  </figure>`;
}

const sources = (items: { title: string; url: string }[]) =>
  `<h3>Sources</h3><ul class="links">${items.map((s) => `<li>${external(s.url, s.title)}</li>`).join('')}</ul>`;

export function renderOverview(): string {
  const mapped = schemes.filter(isMapped).length;
  const rows = regions.map((r) => {
    const inRegion = schemesIn(r.id);
    const sites = inRegion.filter(isMapped).length;
    const atRisk = inRegion.filter((s) => s.stage === 'at_risk').length;
    const counts = [plural(sites, 'site'), `${inRegion.length - sites} region-wide`, plural(assetsIn(r.id).length, 'asset')];
    return `<li><button type="button" class="row row-region" data-region="${r.id}" style="--region:${REGION_COLOURS[r.id]}">
      <span class="row-name">${esc(r.name)}</span>
      <span class="row-meta">${esc(r.nation)} · ${counts.join(' · ')}${atRisk ? ` · <span class="chip chip-stage chip-at_risk">${atRisk} at risk</span>` : ''}</span>
    </button></li>`;
  });
  return `<h2 tabindex="-1">Priority regions</h2>
    <p class="lede">Choose a region on the map or in this list to see its investment sites, region-wide programmes and innovation assets.</p>
    <p class="hint">${schemes.length} schemes (${mapped} on the map, ${schemes.length - mapped} region-wide) and ${allAssets.length} universities, Catapult centres and research centres.</p>
    ${list(rows)}`;
}

export function renderSearch(query: string, found: { schemes: Scheme[]; assets: Asset[] }): string {
  const total = found.schemes.length + found.assets.length;
  return `<h2 tabindex="-1">${plural(total, 'result')} for “${esc(query)}”</h2>
    <p><button type="button" class="link" data-action="clear-search">Clear search</button></p>
    ${found.schemes.length ? `<h3>Schemes</h3>${list(found.schemes.map((s) => schemeRow(s, true)))}` : ''}
    ${found.assets.length ? `<h3>Innovation and R&amp;D assets</h3>${list(found.assets.map((a) => assetRow(a, true)))}` : ''}
    ${total ? '' : '<p>Nothing matches. Search covers names, other names, places and status text.</p>'}`;
}

export function renderRegion(r: Region): string {
  const inRegion = schemesIn(r.id);
  const sites = inRegion.filter(isMapped);
  const wide = inRegion.filter((s) => !isMapped(s));
  const regionAssets = assetsIn(r.id);
  const stageCounts = STAGES.map((stage) => [stage, inRegion.filter((s) => s.stage === stage).length] as const).filter(([, n]) => n);
  const themeCounts = new Map<string, number>();
  for (const s of inRegion) for (const t of s.themes) themeCounts.set(t, (themeCounts.get(t) ?? 0) + 1);
  const topThemes = [...themeCounts].sort((a, b) => b[1] - a[1]).slice(0, 4);

  return `<p><button type="button" class="link back" data-action="home">All regions</button></p>
    <h2 tabindex="-1" class="region-heading" style="--region:${REGION_COLOURS[r.id]}">${esc(r.name)}</h2>
    <p class="lede">${esc(r.body)}</p>
    <p class="hint">${esc(r.type)} · ${esc(r.nation)} · ${plural(r.lads.length, 'council')}</p>
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
      return items.length ? `<h4>${KIND_PLURALS[kind]}</h4>${list(items.map((a) => assetRow(a, false)))}` : '';
    }).join('')}
    <h3>Governance papers</h3>
    <ul class="links">${r.governance_sources.map((g) => `<li>${external(g.url, g.label)}</li>`).join('')}</ul>`;
}

const fact = (label: string, value: string) => (value ? `<div><dt>${label}</dt><dd>${value}</dd></div>` : '');

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
  return `<p><button type="button" class="link back" data-action="back">${esc(backLabel)}</button></p>
    ${figure(s.image)}
    <h2 tabindex="-1">${esc(s.name)}</h2>
    ${s.aliases.length ? `<p class="hint">Also called: ${s.aliases.map(esc).join(', ')}</p>` : ''}
    <p class="chips"><span class="chip">${TYPE_LABELS[s.type]}</span> ${stageChip(s)}</p>
    <dl class="facts">
      ${fact('Region', `<button type="button" class="link" data-region="${region.id}">${esc(region.name)}</button>`)}
      ${fact('Place', s.place ? `${esc(s.place)}<br /><span class="hint">${precision}</span>` : '')}
      ${fact('Value', value)}
      ${fact('Funding', esc(s.funding))}
      ${fact('Status date', esc(formatDate(s.status_date)) || '<span class="hint">Not recorded</span>')}
    </dl>
    <h3>Latest position</h3>
    <p>${esc(s.status)}</p>
    <div class="unknowns">
      <h3>What we don’t know</h3>
      <p>${s.unknowns ? esc(s.unknowns) : 'Nothing recorded yet.'}</p>
    </div>
    <h3>Themes</h3>
    <p class="chips">${s.themes.map((t) => `<span class="chip chip-theme">${capitalise(t)}</span>`).join(' ')}</p>
    ${sources(s.sources)}
    <p class="confidence" title="${esc(CONFIDENCE_HELP[s.confidence])}"><span class="chip chip-confidence-${s.confidence}">${capitalise(s.confidence)} confidence</span> ${esc(CONFIDENCE_HELP[s.confidence].split(': ')[1])}</p>
    <p><button type="button" class="button" data-action="copy" data-id="${s.id}">Copy summary</button> <span class="hint" id="copy-status" role="status"></span></p>`;
}

export function renderAsset(a: Asset, backLabel: string): string {
  const region = regionById.get(a.region)!;
  return `<p><button type="button" class="link back" data-action="back">${esc(backLabel)}</button></p>
    ${figure(a.image)}
    <h2 tabindex="-1">${esc(a.name)}</h2>
    <p class="chips"><span class="chip"><span class="asset-badge asset-${a.kind}" aria-hidden="true">${KIND_LETTER[a.kind]}</span>${KIND_LABELS[a.kind]}</span></p>
    ${a.summary ? `<p>${esc(a.summary)}</p>` : ''}
    <dl class="facts">
      ${fact('Region', `<button type="button" class="link" data-region="${region.id}">${esc(region.name)}</button>`)}
      ${fact('Established', a.established ? String(a.established) : '')}
      ${fact('Students', a.students ? a.students.toLocaleString('en-GB') : '')}
      ${fact('Website', a.website ? external(a.website, a.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')) : '')}
      ${fact('Location', `${a.loc_precision === 'area' ? 'Indicative' : 'From'} ${esc(a.loc_source)}`)}
    </dl>
    ${sources(a.sources)}
    <p class="hint">Facts come from Wikidata and OpenStreetMap, not from board papers. Check before quoting.</p>`;
}
