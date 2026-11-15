import './style.css';
import { assetById, filterAssets, filterSchemes, lastChecked, loadData, regionById, schemeById, type Filters } from './data';
import { assetIcon, cpcIcon, schemeIcon } from './icons';
import { GROUP_COLOURS, GROUP_LABELS, KIND_LABELS, STAGE_CLASS_LABELS, formatDate, type StageClass, type TypeGroup } from './labels';
import { createMap, type MapApi } from './map';
import { activeFilterCount, renderAsset, renderCompare, renderList, renderMoved, renderOverview, renderRegion, renderScheme, schemeSummary, toCsv } from './panel';
import { ASSET_KINDS } from './schema';

type View = 'regions' | 'list' | 'compare' | 'moved';
const VIEWS: [View, string][] = [
  ['regions', 'Regions'],
  ['list', 'Schemes'],
  ['compare', 'Compare'],
  ['moved', 'What’s moved'],
];

interface State {
  view: View;
  region?: string;
  scheme?: string;
  asset?: string;
  filters: Filters;
  movedRegion: string;
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const main = $('main');
const panel = $('panel');
const panelBody = $('panel-body');
const searchInput = $<HTMLInputElement>('search');
const sheetButton = $<HTMLButtonElement>('sheet-button');
const isMobile = () => window.matchMedia('(max-width: 767px)').matches;

// ---------- State lives in the URL hash, so a link reopens the same view ----------

const LIST_KEYS = { fr: 'regions', th: 'themes', ty: 'types', st: 'stages', cf: 'confidence', cat: 'catapults' } as const;
const emptyFilters = (): Filters => ({ q: '', regions: [], themes: [], types: [], stages: [], confidence: [], catapults: [], unknowns: false, nwf: false });

function readState(): State {
  const params = new URLSearchParams(location.hash.slice(1));
  const filters = emptyFilters();
  filters.q = params.get('q') ?? '';
  for (const [key, field] of Object.entries(LIST_KEYS)) filters[field] = (params.get(key) ?? '').split('|').filter(Boolean);
  filters.unknowns = params.get('unk') === '1';
  filters.nwf = params.get('nwf') === '1';
  const requested = params.get('view') as View | null;
  const view: View = VIEWS.some(([v]) => v === requested) ? requested! : filters.q || activeFilterCount(filters) ? 'list' : 'regions';
  const state: State = { view, filters, movedRegion: regionById.has(params.get('mr') ?? '') ? params.get('mr')! : '' };
  const region = params.get('region');
  const scheme = params.get('scheme');
  const asset = params.get('asset');
  if (region && regionById.has(region)) state.region = region;
  if (scheme && schemeById.has(scheme)) state.scheme = scheme;
  else if (asset && assetById.has(asset)) state.asset = asset;
  return state;
}

function writeHash(next: State): string {
  const params = new URLSearchParams();
  if (next.view !== 'regions') params.set('view', next.view);
  if (next.region) params.set('region', next.region);
  if (next.scheme) params.set('scheme', next.scheme);
  if (next.asset) params.set('asset', next.asset);
  if (next.filters.q) params.set('q', next.filters.q);
  for (const [key, field] of Object.entries(LIST_KEYS)) if (next.filters[field].length) params.set(key, next.filters[field].join('|'));
  if (next.filters.unknowns) params.set('unk', '1');
  if (next.filters.nwf) params.set('nwf', '1');
  if (next.movedRegion) params.set('mr', next.movedRegion);
  return params.toString();
}

let map: MapApi | undefined;
let state: State;
let filtersOpen = false;
/** null means automatic: council boundaries show whenever a region is open. */
let councilsChoice: boolean | null = null;

function navigate(patch: Partial<State>, options: { focus?: string | false } = {}) {
  const hash = writeHash({ ...state, ...patch });
  pendingFocus = options.focus;
  if (hash === location.hash.slice(1)) apply(true);
  else if (hash) location.hash = hash;
  else {
    history.pushState(null, '', location.pathname + location.search);
    apply(true);
  }
}
let pendingFocus: string | false | undefined;

const currentResults = () => ({ schemes: filterSchemes(state.filters), assets: filterAssets(state.filters) });

function apply(userAction: boolean) {
  state = readState();
  if (document.activeElement !== searchInput) searchInput.value = state.filters.q;
  const scheme = state.scheme ? schemeById.get(state.scheme) : undefined;
  const asset = state.asset ? assetById.get(state.asset) : undefined;
  const item = scheme ?? asset;
  const backLabel =
    state.view === 'list' ? 'Back to the list' : state.view === 'moved' ? 'Back to what’s moved' : state.view === 'compare' ? 'Back to compare' : item ? `Back to ${regionById.get(item.region)!.name}` : '';

  const results = state.view === 'list' ? currentResults() : null;
  if (scheme) panelBody.innerHTML = renderScheme(scheme, backLabel);
  else if (asset) panelBody.innerHTML = renderAsset(asset, backLabel);
  else if (results) panelBody.innerHTML = renderList(state.filters, results, filtersOpen);
  else if (state.view === 'compare') panelBody.innerHTML = renderCompare();
  else if (state.view === 'moved') panelBody.innerHTML = renderMoved(state.movedRegion);
  else if (state.region) panelBody.innerHTML = renderRegion(regionById.get(state.region)!);
  else panelBody.innerHTML = renderOverview();

  // The compare table needs the full width, so the map steps aside.
  main.classList.toggle('wide', state.view === 'compare' && !item);
  $('tabs').innerHTML = VIEWS.map(
    ([view, label]) => `<button type="button" data-view="${view}"${view === state.view ? ' aria-current="page"' : ''}>${label}</button>`,
  ).join('');
  const viewLabel = VIEWS.find(([v]) => v === state.view)![1];
  document.title = [item?.name ?? (state.view === 'regions' ? state.region && regionById.get(state.region)!.name : viewLabel), 'Regional growth intelligence map'].filter(Boolean).join(' – ');

  const focus = pendingFocus;
  pendingFocus = undefined;
  if (typeof focus === 'string') panelBody.querySelector<HTMLElement>(focus)?.focus({ preventScroll: true });
  else {
    panelBody.scrollTop = 0;
    if (userAction && focus !== false && document.activeElement !== searchInput) {
      if (isMobile() && (item || state.region) && sheetFraction() < 0.5) setSheet(0.55);
      panelBody.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
    }
  }

  if (!map) return;
  const overview = state.view === 'regions' && !state.region && !item;
  map.selectRegion(state.region ?? null, userAction, overview && userAction);
  map.selectPoint(scheme ? 'scheme' : asset ? 'asset' : null, item?.id);
  map.setVisible(results ? results.schemes.map((s) => s.id) : null, results ? results.assets.map((a) => a.id) : null);
  const councils = councilsChoice ?? Boolean(state.region);
  map.setLayer('councils', councils);
  const box = document.getElementById('toggle-councils') as HTMLInputElement | null;
  if (box) box.checked = councils;
}

// ---------- Panel events ----------

panel.addEventListener('click', async (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-region], [data-scheme], [data-asset], [data-action], [data-view]');
  if (!target) return;
  const { region, scheme, asset, action, view } = target.dataset;
  if (view) navigate({ view: view as View, scheme: undefined, asset: undefined, region: view === 'regions' ? undefined : state.region });
  else if (scheme) navigate({ scheme, asset: undefined });
  else if (asset) navigate({ asset, scheme: undefined });
  else if (region) navigate({ view: 'regions', region, scheme: undefined, asset: undefined });
  else if (action === 'home') navigate({ view: 'regions', region: undefined, scheme: undefined, asset: undefined });
  else if (action === 'clear-filters') navigate({ filters: emptyFilters() });
  else if (action === 'print') window.print();
  else if (action === 'back') {
    const item = state.scheme ? schemeById.get(state.scheme) : state.asset ? assetById.get(state.asset) : undefined;
    navigate({ scheme: undefined, asset: undefined, region: state.view === 'regions' ? item?.region : state.region });
  } else if (action === 'csv') {
    const blob = new Blob(['﻿' + toCsv(currentResults())], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `regional-map-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  } else if (action === 'copy') {
    const status = $('copy-status');
    try {
      await navigator.clipboard.writeText(schemeSummary(schemeById.get(target.dataset.id!)!));
      status.textContent = 'Summary copied';
    } catch {
      status.textContent = 'Could not copy. Select the text instead.';
    }
  }
});

panel.addEventListener('change', (event) => {
  const input = event.target as HTMLInputElement | HTMLSelectElement;
  if (input.id === 'moved-region') return navigate({ movedRegion: input.value }, { focus: '#moved-region' });
  const name = (input as HTMLInputElement).dataset?.filter;
  if (!name) return;
  const filters: Filters = { ...state.filters };
  if (name === 'unknowns' || name === 'nwf') filters[name] = (input as HTMLInputElement).checked;
  else {
    const field = name as (typeof LIST_KEYS)[keyof typeof LIST_KEYS];
    filters[field] = [...panelBody.querySelectorAll<HTMLInputElement>(`input[data-filter="${name}"]:checked`)].map((el) => el.value);
  }
  filtersOpen = true;
  const selector = `input[data-filter="${name}"]` + (input.value && input.value !== 'on' ? `[value="${CSS.escape(input.value)}"]` : '');
  navigate({ filters }, { focus: selector });
});
panel.addEventListener('toggle', (event) => {
  const el = event.target as HTMLDetailsElement;
  if (el.id === 'filters') filtersOpen = el.open;
}, true);

$('home-link').addEventListener('click', (event) => {
  event.preventDefault();
  navigate({ view: 'regions', region: undefined, scheme: undefined, asset: undefined, filters: emptyFilters() });
});

let searchTimer: number | undefined;
searchInput.addEventListener('input', () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    const q = searchInput.value.trim();
    navigate({ view: q || state.view === 'list' ? 'list' : state.view, filters: { ...state.filters, q }, scheme: undefined, asset: undefined }, { focus: false });
  }, 200);
});
window.addEventListener('hashchange', () => apply(true));

// ---------- Mobile bottom sheet ----------

const HANDLE = 46;
const SNAPS = [0, 0.25, 0.55, 0.88];
// The sheet animates, so its target height is tracked here and not read from the page.
let sheetHeight = 0;
const sheetFraction = () => (isMobile() ? sheetHeight / main.clientHeight : 0);
function setSheet(fraction: number, refit = true) {
  if (!isMobile()) {
    panel.style.height = '';
    sheetHeight = 0;
    return;
  }
  sheetHeight = Math.max(HANDLE, Math.round(fraction * main.clientHeight));
  panel.style.height = `${sheetHeight}px`;
  const open = fraction > 0.3;
  sheetButton.textContent = open ? 'Show map' : 'Show list';
  sheetButton.setAttribute('aria-expanded', String(open));
  panel.classList.toggle('closed', fraction === 0);
  if (refit) map?.refit();
}
const bottomInset = () => (isMobile() && !main.classList.contains('wide') ? sheetHeight : 0);
sheetButton.addEventListener('click', () => setSheet(sheetFraction() > 0.3 ? 0.25 : 0.88));
{
  const handle = $('sheet-handle');
  let startY = 0;
  let startHeight = 0;
  let dragging = false;
  handle.addEventListener('pointerdown', (e) => {
    if (!isMobile() || (e.target as HTMLElement).closest('button')) return;
    dragging = true;
    startY = e.clientY;
    startHeight = panel.offsetHeight;
    handle.setPointerCapture(e.pointerId);
    panel.classList.add('dragging');
  });
  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const height = Math.min(main.clientHeight * 0.92, Math.max(HANDLE, startHeight + startY - e.clientY));
    panel.style.height = `${height}px`;
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    panel.classList.remove('dragging');
    const now = panel.offsetHeight / main.clientHeight;
    setSheet(SNAPS.reduce((best, s) => (Math.abs(s - now) < Math.abs(best - now) ? s : best)));
  };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
}
let wasMobile = isMobile();
window.addEventListener('resize', () => {
  if (isMobile() !== wasMobile) {
    wasMobile = isMobile();
    setSheet(0.25);
  }
});

// ---------- Key: built from the same drawings as the map markers ----------

function buildLegend() {
  const img = (el: HTMLCanvasElement, size: number) => `<img src="${el.toDataURL()}" height="${size}" alt="" />`;
  const types = (Object.keys(GROUP_LABELS) as TypeGroup[]).map((g) => `<li>${img(schemeIcon(g, 'active'), 22)}${GROUP_LABELS[g]}</li>`);
  const stages = (Object.keys(STAGE_CLASS_LABELS) as StageClass[]).map((s) => `<li>${img(schemeIcon('policy', s), 22)}${STAGE_CLASS_LABELS[s]}</li>`);
  const kinds = ASSET_KINDS.map((k) => `<li>${img(assetIcon(k), 20)}${k === 'catapult' ? 'Catapult site' : KIND_LABELS[k]}</li>`);
  $('legend-body').innerHTML = `
    <h3>Scheme type (colour)</h3><ul>${types.join('')}</ul>
    <h3>Stage (shape)</h3><ul>${stages.join('')}
      <li><span class="halo-key" style="--c:${GROUP_COLOURS.policy}"></span>Soft halo: covers an area</li></ul>
    <h3>Innovation and R&amp;D assets</h3><ul>${kinds.join('')}<li>${img(cpcIcon(), 20)}Connected Places Catapult</li></ul>
    <h3>Layers</h3>
    <label><input type="checkbox" id="toggle-catapults" checked /> Catapult network</label>
    <label><input type="checkbox" id="toggle-assets" checked /> Universities and research centres</label>
    <label><input type="checkbox" id="toggle-councils" /> Show council boundaries</label>
    <p>Locations are approximate. Markers appear when you zoom in or choose a region. The number beside each region name is its count of mapped sites. Council boundaries switch on when you open a region.</p>`;
  const onToggle = (id: string, fn: (checked: boolean) => void) => $<HTMLInputElement>(id).addEventListener('change', (e) => fn((e.target as HTMLInputElement).checked));
  onToggle('toggle-assets', (v) => map?.setLayer('assets', v));
  onToggle('toggle-catapults', (v) => map?.setLayer('catapults', v));
  onToggle('toggle-councils', (v) => {
    councilsChoice = v;
    map?.setLayer('councils', v);
  });
}

// ---------- Start ----------

async function start() {
  $('app').hidden = false;
  try {
    await loadData();
  } catch (error) {
    console.error(error);
    panelBody.innerHTML = '<h2>Data could not load</h2><p>Check your connection and reload the page.</p>';
    return;
  }
  $('last-checked').textContent = `Data last checked: ${formatDate(lastChecked)}`;
  buildLegend();
  setSheet(0.25, false);
  apply(false);
  try {
    map = await createMap($('map'), {
      onRegion: (region) => navigate({ view: 'regions', region, scheme: undefined, asset: undefined }),
      onScheme: (scheme) => navigate({ scheme, asset: undefined }),
      onAsset: (asset) => navigate({ asset, scheme: undefined }),
    }, bottomInset);
    apply(false);
    // Read by the browser tests.
    (window as unknown as { mapView: MapApi['view'] }).mapView = map.view;
  } catch (error) {
    console.error(error);
    $('map').innerHTML = '<p class="map-error">The map could not load. Everything is still available in the list.</p>';
  }
}

// Password screen. A deterrent only: see the README.
const UNLOCK_KEY = 'regional-map-unlocked';
async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function stored(): string | null {
  try {
    return localStorage.getItem(UNLOCK_KEY);
  } catch {
    return null;
  }
}
if (!__PASSWORD_HASH__ || stored() === __PASSWORD_HASH__) void start();
else {
  $('app').hidden = true;
  const gate = document.createElement('main');
  gate.className = 'gate';
  gate.innerHTML = `<form><h1>Regional growth intelligence map</h1>
    <label for="gate-password">Password</label>
    <input id="gate-password" type="password" autocomplete="current-password" required />
    <p class="gate-error" id="gate-error" role="alert"></p>
    <button type="submit" class="button">Continue</button></form>`;
  document.body.append(gate);
  gate.querySelector('form')!.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = (document.getElementById('gate-password') as HTMLInputElement).value;
    if ((await sha256(value)) === __PASSWORD_HASH__) {
      try {
        localStorage.setItem(UNLOCK_KEY, __PASSWORD_HASH__);
      } catch {
        // Private browsing: carry on without remembering.
      }
      gate.remove();
      void start();
    } else $('gate-error').textContent = 'That password is not right. Try again.';
  });
  document.getElementById('gate-password')!.focus();
}
