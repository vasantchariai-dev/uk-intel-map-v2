import './style.css';
import { assetById, lastChecked, regionById, schemeById, search } from './data';
import { assetIcon, schemeIcon } from './icons';
import { GROUP_COLOURS, GROUP_LABELS, KIND_LABELS, STAGE_CLASS_LABELS, formatDate, type StageClass, type TypeGroup } from './labels';
import { createMap, type MapApi } from './map';
import { renderAsset, renderOverview, renderRegion, renderScheme, renderSearch, schemeSummary } from './panel';
import { ASSET_KINDS } from './schema';

interface State {
  region?: string;
  scheme?: string;
  asset?: string;
  q?: string;
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const panel = $('panel');
const panelBody = $('panel-body');
const searchInput = $<HTMLInputElement>('search');
const sheetHandle = $<HTMLButtonElement>('sheet-handle');
const isMobile = () => window.matchMedia('(max-width: 767px)').matches;

// The view lives in the URL hash, so a link reopens the same view.
function readState(): State {
  const params = new URLSearchParams(location.hash.slice(1));
  const state: State = {};
  const region = params.get('region');
  const scheme = params.get('scheme');
  const asset = params.get('asset');
  if (region && regionById.has(region)) state.region = region;
  if (scheme && schemeById.has(scheme)) state.scheme = scheme;
  else if (asset && assetById.has(asset)) state.asset = asset;
  if (params.get('q')) state.q = params.get('q')!;
  return state;
}

function navigate(state: State) {
  const params = new URLSearchParams();
  for (const key of ['region', 'scheme', 'asset', 'q'] as const) if (state[key]) params.set(key, state[key]!);
  const hash = params.toString();
  if (hash === location.hash.slice(1)) apply(true);
  else if (hash) location.hash = hash;
  else history.pushState(null, '', location.pathname + location.search), apply(true);
}

let map: MapApi | undefined;
let state: State = {};

function apply(userAction: boolean) {
  state = readState();
  if (document.activeElement !== searchInput) searchInput.value = state.q ?? '';
  const scheme = state.scheme ? schemeById.get(state.scheme) : undefined;
  const asset = state.asset ? assetById.get(state.asset) : undefined;
  const item = scheme ?? asset;
  const backLabel = state.q ? 'Back to search results' : item ? `Back to ${regionById.get(item.region)!.name}` : '';

  if (scheme) panelBody.innerHTML = renderScheme(scheme, backLabel);
  else if (asset) panelBody.innerHTML = renderAsset(asset, backLabel);
  else if (state.q) panelBody.innerHTML = renderSearch(state.q, search(state.q));
  else if (state.region) panelBody.innerHTML = renderRegion(regionById.get(state.region)!);
  else panelBody.innerHTML = renderOverview();

  document.title = [item?.name ?? (state.region && regionById.get(state.region)!.name), 'Regional growth intelligence map'].filter(Boolean).join(' – ');
  panelBody.scrollTop = 0;
  if (userAction && document.activeElement !== searchInput) {
    if (isMobile() && (item || state.region)) setSheet(true);
    panelBody.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  }
  const overview = !state.region && !item;
  map?.selectRegion(state.region ?? null, userAction, overview && userAction && !state.q);
  map?.selectPoint(scheme ? 'scheme' : asset ? 'asset' : null, item?.id);
}

function setSheet(open: boolean) {
  panel.classList.toggle('collapsed', !open);
  sheetHandle.setAttribute('aria-expanded', String(open));
  sheetHandle.textContent = open ? 'Hide details' : 'Show details';
}
const bottomInset = () => (isMobile() ? Math.max(0, window.innerHeight - panel.getBoundingClientRect().top) : 0);

panel.addEventListener('click', async (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-region], [data-scheme], [data-asset], [data-action]');
  if (!target) return;
  const { region, scheme, asset, action } = target.dataset;
  if (scheme) navigate({ region: state.region, q: state.q, scheme });
  else if (asset) navigate({ region: state.region, q: state.q, asset });
  else if (region) navigate({ region });
  else if (action === 'home') navigate({});
  else if (action === 'clear-search') navigate({ region: state.region });
  else if (action === 'back') {
    const item = state.scheme ? schemeById.get(state.scheme) : state.asset ? assetById.get(state.asset) : undefined;
    navigate(state.q ? { region: state.region, q: state.q } : { region: item?.region });
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

document.querySelector('.header [data-action="home"]')!.addEventListener('click', (event) => {
  event.preventDefault();
  navigate({});
});

let searchTimer: number | undefined;
searchInput.addEventListener('input', () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => navigate({ region: state.region, q: searchInput.value.trim() || undefined }), 200);
});

sheetHandle.addEventListener('click', () => setSheet(panel.classList.contains('collapsed')));
window.addEventListener('hashchange', () => apply(true));

// Key: built from the same drawings as the map markers.
function buildLegend() {
  const img = (el: HTMLCanvasElement, size: number) => `<img src="${el.toDataURL()}" width="${size}" height="${size}" alt="" />`;
  const types = (Object.keys(GROUP_LABELS) as TypeGroup[]).map((g) => `<li>${img(schemeIcon(g, 'active'), 22)}${GROUP_LABELS[g]}</li>`);
  const stages = (Object.keys(STAGE_CLASS_LABELS) as StageClass[]).map((s) => `<li>${img(schemeIcon('policy', s), 22)}${STAGE_CLASS_LABELS[s]}</li>`);
  const kinds = ASSET_KINDS.map((k) => `<li>${img(assetIcon(k), 20)}${KIND_LABELS[k]}</li>`);
  $('legend-body').innerHTML = `
    <h3>Scheme type (colour)</h3><ul>${types.join('')}</ul>
    <h3>Stage (shape)</h3><ul>${stages.join('')}
      <li><span class="halo-key" style="--c:${GROUP_COLOURS.policy}"></span>Soft halo: covers an area</li></ul>
    <h3>Innovation and R&amp;D assets</h3><ul>${kinds.join('')}</ul>
    <h3>Layers</h3>
    <label><input type="checkbox" id="toggle-assets" checked /> Innovation and R&amp;D assets</label>
    <label><input type="checkbox" id="toggle-councils" /> Council boundaries</label>
    <p>Locations are approximate. Markers appear when you zoom in or choose a region. The number beside each region name is its count of mapped sites.</p>`;
  $<HTMLInputElement>('toggle-assets').addEventListener('change', (e) => map?.setLayer('assets', (e.target as HTMLInputElement).checked));
  $<HTMLInputElement>('toggle-councils').addEventListener('change', (e) => map?.setLayer('councils', (e.target as HTMLInputElement).checked));
}

$('last-checked').textContent = `Data last checked: ${formatDate(lastChecked)}`;
buildLegend();
apply(false);

createMap(
  $('map'),
  {
    onRegion: (region) => navigate({ region }),
    onScheme: (scheme) => navigate({ region: state.region, q: state.q, scheme }),
    onAsset: (asset) => navigate({ region: state.region, q: state.q, asset }),
  },
  bottomInset,
)
  .then((api) => {
    map = api;
    apply(false);
    // Read by the browser tests.
    (window as unknown as { mapView: MapApi['view'] }).mapView = api.view;
  })
  .catch((error) => {
    console.error(error);
    $('map').innerHTML = '<p class="map-error">The map could not load. Everything is still available in the list.</p>';
  });
